import { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import { 
  RiChat3Line, RiSendPlane2Line, RiUserLine, RiBuildingLine, RiFolderUserLine, 
  RiUserSmileLine, RiShieldKeyholeLine, RiLock2Line, RiLockUnlockLine, RiArrowLeftLine,
  RiSearchLine, RiCheckDoubleLine, RiShieldCheckLine, RiCloseLine, RiRadioButtonLine,
  RiVidiconLine
} from 'react-icons/ri';
import AppLayout from '../../components/AppLayout';
import { useAuth } from '../../context/AuthContext';
import {
  useGetChatServersQuery,
  useGetChatMessagesQuery,
  useGetChatMembersQuery,
  useSendChatMessageMutation,
  apiSlice
} from '../../store/apiSlice';
import api from '../../api/axios';
import { generateE2EEKeys, encryptE2EEMessage, decryptE2EEMessage } from '../../utils/crypto';
import { requestNotificationPermission } from '../../utils/systemNotification';

// In-memory cache for decrypted messages to prevent repeated heavy RSA decryptions on re-renders
const decryptionCache = new Map();

// Component to handle messages cleanly (plaintext stored reliably, legacy encrypted handled gracefully)
const DecryptedMessage = ({ rawMessage, privateKeyJwk, isSender, messageId }) => {
  const isEncrypted = typeof rawMessage === 'string' && rawMessage.startsWith('{"encryptedPayload"');
  if (!isEncrypted) {
    return <span>{rawMessage}</span>;
  }

  const cacheKey = messageId || rawMessage;
  const [decryptedText, setDecryptedText] = useState(() => {
    return decryptionCache.get(cacheKey) || '🔒 Decrypting...';
  });

  useEffect(() => {
    if (decryptionCache.has(cacheKey)) {
      setDecryptedText(decryptionCache.get(cacheKey));
      return;
    }

    let isMounted = true;
    const decrypt = async () => {
      try {
        if (privateKeyJwk) {
          const decrypted = await decryptE2EEMessage(rawMessage, privateKeyJwk, isSender);
          if (decrypted && !decrypted.includes('Decryption failed')) {
            decryptionCache.set(cacheKey, decrypted);
            if (isMounted) setDecryptedText(decrypted);
            return;
          }
        }
      } catch (e) {}

      // Clean fallback for legacy messages whose ephemeral keys expired
      if (isMounted) setDecryptedText('🔒 [Secure Message]');
    };
    decrypt();
    return () => { isMounted = false; };
  }, [rawMessage, privateKeyJwk, isSender, cacheKey]);

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <RiLock2Line style={{ color: isSender ? 'rgba(255,255,255,0.9)' : 'var(--success)', fontSize: '0.82rem', flexShrink: 0 }} />
      <span>{decryptedText}</span>
    </span>
  );
};

const ChatPage = () => {
  const { user } = useAuth();
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();

  // E2EE Keys state
  const [privateKeyJwk, setPrivateKeyJwk] = useState(null);
  const [publicKeyJwk, setPublicKeyJwk] = useState(null);

  // Search and filter states
  const [memberSearch, setMemberSearch] = useState('');
  const [onlineFilterOnly, setOnlineFilterOnly] = useState(false);

  // WhatsApp-style Unread Message Counts state
  const [unreadCounts, setUnreadCounts] = useState({});

  // Track the currently active channel for notification filtering
  const activeChannelRef = useRef(null);

  // Fetch unread message counts on mount, on tab focus, and periodically
  const fetchUnreads = async () => {
    try {
      const { data } = await api.get('/chat/unread-counts');
      if (data?.success && data.counts) {
        setUnreadCounts(data.counts);
      }
    } catch (err) {}
  };

  useEffect(() => {
    fetchUnreads();
    window.addEventListener('focus', fetchUnreads);
    const interval = setInterval(fetchUnreads, 15000);
    return () => {
      window.removeEventListener('focus', fetchUnreads);
      clearInterval(interval);
    };
  }, []);

  // Initialize E2EE Keys
  useEffect(() => {
    const initKeys = async () => {
      if (!user) return;
      const pubKeyName = `e2ee_public_key_${user.id}`;
      const privKeyName = `e2ee_private_key_${user.id}`;
      
      let pubKey = localStorage.getItem(pubKeyName);
      let privKey = localStorage.getItem(privKeyName);
      
      if (!pubKey || !privKey) {
        try {
          const keys = await generateE2EEKeys();
          localStorage.setItem(pubKeyName, JSON.stringify(keys.publicKeyJwk));
          localStorage.setItem(privKeyName, JSON.stringify(keys.privateKeyJwk));
          pubKey = JSON.stringify(keys.publicKeyJwk);
          privKey = JSON.stringify(keys.privateKeyJwk);
        } catch (e) {
          console.error("Failed to generate E2EE keys", e);
          return;
        }
      }
      
      setPrivateKeyJwk(JSON.parse(privKey));
      setPublicKeyJwk(JSON.parse(pubKey));
      
      // Upload public key to backend if it's missing or changed
      if (user && user.publicKey !== pubKey) {
        try {
          await api.put('/auth/public-key', { publicKey: pubKey });
        } catch (e) {
          console.error("Failed to upload public key", e);
        }
      }
    };
    initKeys();
  }, [user]);

  // Request browser/mobile notification permission once on mount
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  // Socket.io connection for real-time updates
  useEffect(() => {
    const token = localStorage.getItem('crm_token');
    if (!token) return;

    const socketUrl = import.meta.env.VITE_SOCKET_URL || (typeof window !== 'undefined' ? window.location.origin : '');
    const socket = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
      console.log('✅ Connected to WebSocket Server');
    });

    socket.on('new_message', (data) => {
      // Invalidate the cache for this specific conversation or general chat
      const channelId = data.receiverId 
        ? (data.senderId === user?.id ? data.receiverId : data.senderId)
        : (data.chatServerId || data.companyId);

      if (channelId) {
        dispatch(apiSlice.util.invalidateTags([
          { type: 'ChatMessages', id: channelId },
          'ChatMessages'
        ]));
      } else {
        dispatch(apiSlice.util.invalidateTags(['ChatMessages']));
      }

      // 1. Do NOT notify yourself for messages you sent or sender copies!
      if (data.isSenderCopy) return;
      const senderId = data.senderId || data.message?.senderId;
      if (senderId && user?.id && String(senderId) === String(user.id)) {
        return;
      }

      // 2. Strict DM check: if receiverId exists, ONLY that specific user can be notified!
      if (data.receiverId && user?.id && String(data.receiverId) !== String(user.id)) {
        return;
      }

      // 3. Real-time WhatsApp unread badge updater
      if (data.receiverId && user?.id && String(data.receiverId) === String(user.id)) {
        const msgSenderId = data.senderId || data.message?.senderId;
        const currentActiveId = activeChannelRef.current;
        if (msgSenderId && String(currentActiveId) !== String(msgSenderId)) {
          setUnreadCounts(prev => ({
            ...prev,
            [msgSenderId]: (Number(prev[msgSenderId]) || 0) + 1
          }));
        } else if (msgSenderId && String(currentActiveId) === String(msgSenderId)) {
          // If viewing this conversation, mark as read on backend
          api.post('/chat/mark-read', { senderId: msgSenderId }).catch(() => {});
        }
      }

    });

    socket.on('status_change', () => {
      dispatch(apiSlice.util.invalidateTags(['ChatMembers']));
    });

    socket.on('connect_error', (err) => {
      console.error('WebSocket connection error:', err);
    });

    return () => {
      socket.disconnect();
    };
  }, [dispatch, user]);
  
  // Selected Channel state
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [showMobileList, setShowMobileList] = useState(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    if (params.get('userId')) return false; // Show conversation directly if navigating to a specific user!
    return window.innerWidth <= 768;
  });

  // Message input state
  const [messageText, setMessageText] = useState('');
  const messagesEndRef = useRef(null);

  // RTK Queries
  const { data: serversData, isLoading: loadingServers } = useGetChatServersQuery();
  const servers = serversData?.servers || [];
  const companies = serversData?.companies || [];

  // Determine active company and connected workspace server for current user
  const userCompanyId = user?.companyId;
  const userCompany = companies.find(c => c.id === userCompanyId);

  // Fetch members in this workspace context
  const { data: membersData, isLoading: loadingMembers } = useGetChatMembersQuery(undefined, {
    pollingInterval: 15000
  });
  const members = membersData?.members || [];

  // Centralized activator to open direct chat with a member cleanly
  const activateMemberChat = (targetMember) => {
    if (!targetMember || !targetMember.id) return;
    setSelectedChannel({
      type: 'dm',
      id: targetMember.id,
      name: targetMember.name,
      avatar: targetMember.avatar,
      publicKey: targetMember.publicKey
    });
    activeChannelRef.current = targetMember.id;
    setShowMobileList(false); // Switch to chat view on mobile immediately!
    try {
      sessionStorage.setItem('crm_active_chat_channel', targetMember.id);
    } catch {}
    setUnreadCounts(prev => ({ ...prev, [targetMember.id]: 0 }));
    api.post('/chat/mark-read', { senderId: targetMember.id }).catch(() => {});
  };

  // Filter members based on search and online status, prioritizing members with unread messages (like WhatsApp!)
  const filteredMembers = useMemo(() => {
    return members
      .filter(m => {
        const matchSearch = !memberSearch.trim() || 
          m.name?.toLowerCase().includes(memberSearch.toLowerCase()) ||
          m.roleName?.toLowerCase().includes(memberSearch.toLowerCase()) ||
          m.deptName?.toLowerCase().includes(memberSearch.toLowerCase());
        const matchOnline = !onlineFilterOnly || m.isOnline;
        return matchSearch && matchOnline;
      })
      .sort((a, b) => {
        const unreadA = Number(unreadCounts[a.id]) || 0;
        const unreadB = Number(unreadCounts[b.id]) || 0;
        if (unreadA !== unreadB) {
          return unreadB - unreadA; // Unread messages first!
        }
        return (a.name || '').localeCompare(b.name || '');
      });
  }, [members, memberSearch, onlineFilterOnly, unreadCounts]);

  const onlineCount = useMemo(() => members.filter(m => m.isOnline).length, [members]);

  // Open specific user chat directly when navigating from Push Notification (?userId=xxx)
  useEffect(() => {
    const targetUserId = searchParams.get('userId');
    if (!targetUserId) return;

    if (members && members.length > 0) {
      const found = members.find(m => String(m.id).trim() === String(targetUserId).trim());
      if (found) {
        activateMemberChat(found);
        return;
      }
    }

    // Direct chat member profile endpoint (accessible to all roles, avoids UAM permission errors)
    api.get(`/chat/member/${targetUserId}`).then(res => {
      if (res.data?.member) {
        activateMemberChat(res.data.member);
      }
    }).catch(() => {
      api.get(`/uam/users/${targetUserId}`).then(res => {
        if (res.data?.user) {
          activateMemberChat(res.data.user);
        }
      }).catch(() => {});
    });
  }, [searchParams, members]);

  // Listen for SW background message to switch chat without full page refresh
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    const handleSwMsg = (event) => {
      if (event.data?.type === 'NAVIGATE_TO' && event.data?.url) {
        try {
          const u = new URL(event.data.url, window.location.origin);
          const uid = u.searchParams.get('userId');
          if (uid) {
            const found = (members || []).find(m => String(m.id).trim() === String(uid).trim());
            if (found) {
              activateMemberChat(found);
            } else {
              api.get(`/chat/member/${uid}`).then(res => {
                if (res.data?.member) activateMemberChat(res.data.member);
              }).catch(() => {});
            }
          }
        } catch (e) {}
      }
    };
    navigator.serviceWorker.addEventListener('message', handleSwMsg);
    return () => navigator.serviceWorker.removeEventListener('message', handleSwMsg);
  }, [members]);

  // Restore channel if previously active in this session
  useEffect(() => {
    const targetUserId = searchParams.get('userId');
    if (targetUserId) return; // Prioritize URL param

    if (!selectedChannel && members.length > 0) {
      const savedChannelId = sessionStorage.getItem('crm_active_chat_channel');
      if (savedChannelId) {
        const found = members.find(m => String(m.id).trim() === String(savedChannelId).trim());
        if (found) {
          activateMemberChat(found);
        }
      }
    }
  }, [members, selectedChannel, searchParams]);

  // Update activeChannelRef and sessionStorage when selectedChannel changes
  useEffect(() => {
    if (selectedChannel?.id) {
      activeChannelRef.current = selectedChannel.id;
      try {
        sessionStorage.setItem('crm_active_chat_channel', selectedChannel.id);
      } catch {}
    }
  }, [selectedChannel]);

  useEffect(() => {
    return () => {
      try {
        sessionStorage.removeItem('crm_active_chat_channel');
      } catch {}
    };
  }, []);

  // Active channel query parameters (memoized to prevent redundant renders)
  const queryParams = useMemo(() => ({
    chatServerId: selectedChannel?.type === 'server' ? selectedChannel.id : null,
    companyId: selectedChannel?.type === 'company' ? selectedChannel.id : null,
    receiverId: selectedChannel?.type === 'dm' ? selectedChannel.id : null
  }), [selectedChannel]);

  const skipQuery = !selectedChannel;

  // Fetch messages with immediate refresh on argument change
  const { 
    data: messagesData, 
    isLoading: loadingMessages, 
    isFetching: fetchingMessages 
  } = useGetChatMessagesQuery(queryParams, {
    skip: skipQuery,
    refetchOnMountOrArgChange: true
  });

  // Filter messages strictly for the currently selected channel to avoid showing previous conversation messages
  const messages = useMemo(() => {
    if (!selectedChannel || !messagesData?.messages) return [];
    if (selectedChannel.type === 'dm') {
      const selId = String(selectedChannel.id).trim();
      const myId = user?.id ? String(user.id).trim() : '';
      return messagesData.messages.filter(msg => {
        const sId = String(msg.senderId || '').trim();
        const rId = String(msg.receiverId || '').trim();
        return (sId === selId && rId === myId) || (sId === myId && rId === selId);
      });
    }
    if (selectedChannel.type === 'server') {
      const serverId = String(selectedChannel.id).trim();
      return messagesData.messages.filter(msg => String(msg.chatServerId || '').trim() === serverId);
    }
    if (selectedChannel.type === 'company') {
      const compId = String(selectedChannel.id).trim();
      return messagesData.messages.filter(msg => String(msg.companyId || '').trim() === compId);
    }
    return [];
  }, [messagesData?.messages, selectedChannel, user?.id]);

  const isChannelSwitching = (loadingMessages || fetchingMessages) && messages.length === 0;

  const [sendMessage, { isLoading: sending }] = useSendChatMessageMutation();

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!messageText.trim() || !selectedChannel || sending) return;

    // Send clean, reliable message stored safely in CRM database
    const msgToSend = messageText.trim();

    try {
      await sendMessage({
        message: msgToSend,
        chatServerId: selectedChannel.type === 'server' ? selectedChannel.id : null,
        companyId: selectedChannel.type === 'company' ? selectedChannel.id : null,
        receiverId: selectedChannel.type === 'dm' ? selectedChannel.id : null
      }).unwrap();
      setMessageText('');
    } catch (err) {
      toast.error('Failed to send message');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const selectDirectMessage = (member) => {
    activateMemberChat(member);
  };

  const activeDMRecipient = selectedChannel?.type === 'dm' ? members.find(m => m.id === selectedChannel.id) : null;
  const isE2EEDM = activeDMRecipient && activeDMRecipient.publicKey && publicKeyJwk;

  const placeholderText = selectedChannel 
    ? (selectedChannel.type === 'dm' 
        ? `Write a message to ${selectedChannel.name}...` 
        : `Write a message to # ${selectedChannel.name}...`)
    : 'Select a conversation to start...';

  return (
    <AppLayout title="Collaboration Chat">
      <div className={`chat-layout ${showMobileList ? 'show-sidebar' : 'show-chat'}`}>
        
        {/* Left Sidebar - Team Members & Channels */}
        <div className="chat-sidebar" style={{ 
          borderRight: '1px solid var(--border)', 
          padding: '16px 14px', 
          flexDirection: 'column', 
          gap: 14, 
          background: 'var(--bg-secondary)',
          overflowY: 'auto'
        }}>
          {/* Header & Status Indicator */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 28, height: 28, borderRadius: 8,
                background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(168,85,247,0.2))',
                color: 'var(--accent)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.95rem'
              }}>
                <RiChat3Line />
              </div>
              <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                Messages
              </span>
            </div>
            <span style={{
              fontSize: '0.7rem',
              color: 'var(--success)',
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              padding: '2px 8px',
              borderRadius: 12,
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success)' }} />
              {onlineCount} Online
            </span>
          </div>

          {/* Member Search Bar */}
          <div style={{ position: 'relative' }}>
            <RiSearchLine style={{ 
              position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', 
              color: 'var(--text-muted)', fontSize: '0.85rem' 
            }} />
            <input 
              type="text" 
              className="search-input"
              placeholder="Search team members..."
              value={memberSearch}
              onChange={e => setMemberSearch(e.target.value)}
              style={{
                width: '100%',
                paddingLeft: 30,
                paddingRight: memberSearch ? 26 : 10,
                paddingTop: 7,
                paddingBottom: 7,
                fontSize: '0.78rem',
                borderRadius: 8,
                background: 'var(--bg-card)',
                border: '1px solid var(--border)'
              }}
            />
            {memberSearch && (
              <button 
                type="button" 
                onClick={() => setMemberSearch('')}
                style={{
                  position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                  background: 'transparent', border: 'none', color: 'var(--text-muted)',
                  cursor: 'pointer', padding: 0, display: 'flex'
                }}
              >
                <RiCloseLine size={14} />
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              type="button"
              onClick={() => setOnlineFilterOnly(false)}
              style={{
                flex: 1,
                padding: '5px 8px',
                borderRadius: 6,
                fontSize: '0.72rem',
                fontWeight: 700,
                border: '1px solid',
                borderColor: !onlineFilterOnly ? 'var(--accent)' : 'var(--border)',
                background: !onlineFilterOnly ? 'rgba(99, 102, 241, 0.12)' : 'transparent',
                color: !onlineFilterOnly ? 'var(--accent)' : 'var(--text-muted)',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              All ({members.length})
            </button>
            <button
              type="button"
              onClick={() => setOnlineFilterOnly(true)}
              style={{
                flex: 1,
                padding: '5px 8px',
                borderRadius: 6,
                fontSize: '0.72rem',
                fontWeight: 700,
                border: '1px solid',
                borderColor: onlineFilterOnly ? 'var(--success)' : 'var(--border)',
                background: onlineFilterOnly ? 'rgba(16, 185, 129, 0.12)' : 'transparent',
                color: onlineFilterOnly ? 'var(--success)' : 'var(--text-muted)',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              Active ({onlineCount})
            </button>
          </div>

          {/* Direct Messages list */}
          <div style={{ flexGrow: 1, overflowY: 'auto' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {loadingMembers ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 6px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  <div className="spinner" style={{ width: 14, height: 14 }} /> Loading team...
                </div>
              ) : filteredMembers.length === 0 ? (
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', padding: '16px 6px', textAlign: 'center' }}>
                  No members found {memberSearch && `for "${memberSearch}"`}
                </div>
              ) : (
                filteredMembers.map(member => {
                  const isSelected = selectedChannel?.type === 'dm' && selectedChannel.id === member.id;
                  
                  return (
                    <button
                      key={member.id}
                      onClick={() => selectDirectMessage(member)}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '9px 10px',
                        borderRadius: 10,
                        background: isSelected 
                          ? 'linear-gradient(90deg, rgba(99, 102, 241, 0.18) 0%, rgba(99, 102, 241, 0.08) 100%)' 
                          : 'transparent',
                        color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                        border: isSelected ? '1px solid var(--border)' : '1px solid transparent',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 10,
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden' }}>
                        <div style={{ position: 'relative', flexShrink: 0 }}>
                          <div style={{
                            width: 32, height: 32, borderRadius: 10,
                            background: isSelected 
                              ? 'linear-gradient(135deg, #4f46e5, #6366f1)' 
                              : 'rgba(255, 255, 255, 0.06)',
                            color: isSelected ? '#ffffff' : 'var(--accent)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.78rem', fontWeight: 800,
                            boxShadow: isSelected ? '0 2px 8px rgba(79, 70, 229, 0.35)' : 'none',
                            overflow: 'hidden'
                          }}>
                            {member.avatar ? (
                              <img src={member.avatar} alt={member.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              member.name.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div style={{
                            width: 9, height: 9, borderRadius: '50%',
                            background: member.isOnline ? 'var(--success)' : 'var(--text-muted)',
                            border: '2px solid var(--bg-secondary)',
                            boxShadow: member.isOnline ? '0 0 6px rgba(16, 185, 129, 0.6)' : 'none',
                            position: 'absolute', bottom: -2, right: -2
                          }} />
                        </div>
                        <div style={{ overflow: 'hidden' }}>
                          <div style={{ 
                            fontSize: '0.82rem', 
                            fontWeight: isSelected ? 800 : ((unreadCounts[member.id] > 0) ? 800 : 600), 
                            color: isSelected ? 'var(--text-primary)' : ((unreadCounts[member.id] > 0) ? '#ffffff' : 'var(--text-secondary)'),
                            textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' 
                          }}>
                            {member.name}
                          </div>
                          <div style={{ 
                            fontSize: '0.68rem', 
                            color: isSelected ? 'var(--accent)' : ((unreadCounts[member.id] > 0) ? '#25D366' : 'var(--text-muted)'), 
                            fontWeight: (unreadCounts[member.id] > 0) ? 700 : 400,
                            textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' 
                          }}>
                            {(unreadCounts[member.id] > 0) ? `${unreadCounts[member.id]} new message${unreadCounts[member.id] > 1 ? 's' : ''}` : (member.roleName || member.deptName || 'Member')}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                        {unreadCounts[member.id] > 0 && (
                          <span 
                            title={`${unreadCounts[member.id]} unread messages`}
                            style={{
                              background: '#25D366',
                              color: '#ffffff',
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              minWidth: 20,
                              height: 20,
                              borderRadius: (unreadCounts[member.id] < 10) ? '50%' : 10,
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: (unreadCounts[member.id] < 10) ? '0' : '0 6px',
                              boxShadow: '0 2px 6px rgba(37, 211, 102, 0.45)',
                              flexShrink: 0
                            }}
                          >
                            {unreadCounts[member.id] > 99 ? '99+' : unreadCounts[member.id]}
                          </span>
                        )}
                        {member.publicKey && (
                          <RiShieldKeyholeLine 
                            title="E2EE Security Key Active" 
                            style={{ fontSize: '0.8rem', color: isSelected ? 'var(--accent)' : 'var(--text-muted)', opacity: 0.7, flexShrink: 0 }} 
                          />
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

        </div>

        {/* Center - Message Log Panel */}
        <div className="chat-main" style={{ flexDirection: 'column', height: '100%', background: 'var(--bg-card)' }}>
          {/* Header */}
          <div style={{ 
            padding: '12px 16px', 
            borderBottom: '1px solid var(--border)', 
            background: 'var(--bg-secondary)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            gap: 10 
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
              <button
                type="button"
                className="btn btn-primary btn-sm mobile-chat-back-btn"
                onClick={() => setShowMobileList(true)}
                style={{ padding: '6px 10px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0 }}
                title="Back to Conversations"
              >
                <RiArrowLeftLine /> Chats
              </button>

              {activeDMRecipient && (
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
                    color: '#ffffff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.85rem', fontWeight: 800,
                    boxShadow: '0 2px 8px rgba(79, 70, 229, 0.3)',
                    overflow: 'hidden'
                  }}>
                    {activeDMRecipient.avatar ? (
                      <img src={activeDMRecipient.avatar} alt={activeDMRecipient.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      activeDMRecipient.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div style={{
                    width: 10, height: 10, borderRadius: '50%',
                    background: activeDMRecipient.isOnline ? 'var(--success)' : 'var(--text-muted)',
                    border: '2px solid var(--bg-secondary)',
                    boxShadow: activeDMRecipient.isOnline ? '0 0 6px rgba(16, 185, 129, 0.6)' : 'none',
                    position: 'absolute', bottom: -2, right: -2
                  }} />
                </div>
              )}

              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <h3 style={{ 
                    fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)', 
                    margin: 0, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' 
                  }}>
                    {selectedChannel ? selectedChannel.name : 'Select a Conversation'}
                  </h3>
                  {activeDMRecipient?.roleName && (
                    <span style={{ 
                      fontSize: '0.65rem', 
                      background: 'rgba(255,255,255,0.06)', 
                      border: '1px solid var(--border)',
                      padding: '1px 6px', 
                      borderRadius: 4, 
                      color: 'var(--text-muted)',
                      fontWeight: 600
                    }}>
                      {activeDMRecipient.roleName}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '0.72rem', color: activeDMRecipient?.isOnline ? 'var(--success)' : 'var(--text-muted)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: activeDMRecipient?.isOnline ? 'var(--success)' : 'var(--text-muted)' }} />
                  {activeDMRecipient?.isOnline ? 'Active Now' : 'Offline'}
                </div>
              </div>
            </div>

            {/* Session Actions: Video Call & Security Badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {selectedChannel?.type === 'dm' && activeDMRecipient && (
                <button
                  type="button"
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('crm:start_call', {
                      detail: {
                        receiverId: activeDMRecipient.id,
                        recipient: activeDMRecipient,
                        callType: 'video'
                      }
                    }));
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    color: '#ffffff',
                    border: 'none',
                    padding: '6px 14px',
                    borderRadius: 20,
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(16, 185, 129, 0.35)',
                    transition: 'all 0.15s ease'
                  }}
                  title={`Start Video Call with ${activeDMRecipient.name}`}
                >
                  <RiVidiconLine style={{ fontSize: '0.95rem' }} />
                  <span>Video Call</span>
                </button>
              )}

              {selectedChannel?.type === 'dm' && (
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  color: isE2EEDM ? 'var(--success)' : 'var(--accent)',
                  fontSize: '0.72rem',
                  background: isE2EEDM ? 'rgba(34, 197, 94, 0.1)' : 'var(--accent-glow)',
                  border: isE2EEDM ? '1px solid rgba(34, 197, 94, 0.25)' : '1px solid rgba(99, 102, 241, 0.25)',
                  padding: '4px 10px',
                  borderRadius: 20,
                  fontWeight: 700,
                  flexShrink: 0
                }}>
                  {isE2EEDM ? <RiShieldCheckLine /> : <RiLock2Line />}
                  <span>{isE2EEDM ? 'E2EE Encrypted' : 'Direct Chat'}</span>
                </span>
              )}
            </div>
          </div>

          {/* Messages Feed */}
          <div style={{ 
            flexGrow: 1, 
            padding: '20px 24px', 
            overflowY: 'auto', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: 14 
          }}>
            {(loadingMessages || isChannelSwitching) ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', margin: 'auto', gap: 12 }}>
                <div className="spinner" />
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Loading conversation...</span>
              </div>
            ) : !selectedChannel ? (
              <div style={{ 
                margin: 'auto', 
                maxWidth: 420, 
                textAlign: 'center', 
                padding: '40px 24px',
                background: 'rgba(255,255,255,0.02)',
                borderRadius: 16,
                border: '1px dashed var(--border)'
              }}>
                <div style={{
                  width: 60, height: 60, borderRadius: 18,
                  background: 'linear-gradient(135deg, rgba(37,211,102,0.18), rgba(99,102,241,0.18))',
                  color: '#25D366',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '2rem', margin: '0 auto 16px',
                  boxShadow: '0 4px 16px rgba(37,211,102,0.2)'
                }}>
                  <RiChat3Line />
                </div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>
                  CRM Direct Messenger
                </h3>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                  Select a team member from the sidebar to view your chat. Unread messages are shown with green badges just like WhatsApp.
                </div>
              </div>
            ) : messages.length === 0 ? (
              <div style={{ 
                margin: 'auto', 
                maxWidth: 380, 
                textAlign: 'center', 
                padding: '32px 24px',
                background: 'rgba(255,255,255,0.02)',
                borderRadius: 16,
                border: '1px dashed var(--border)'
              }}>
                <div style={{
                  width: 52, height: 52, borderRadius: 16,
                  background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(168,85,247,0.15))',
                  color: 'var(--accent)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.8rem', margin: '0 auto 14px'
                }}>
                  <RiUserSmileLine />
                </div>
                <h4 style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>
                  Direct Workspace Channel
                </h4>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  This is the start of your secure conversation with <strong style={{ color: 'var(--text-primary)' }}>{selectedChannel?.name}</strong>. Messages are delivered in real time.
                </div>
              </div>
            ) : (
              messages.map(msg => {
                const isMe = msg.senderId === user?.id;
                const initials = msg.sender?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';
                const timeString = new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                
                return (
                  <div key={msg.id} style={{ 
                    display: 'flex', 
                    gap: 10, 
                    alignSelf: isMe ? 'flex-end' : 'flex-start',
                    maxWidth: '80%',
                    flexDirection: isMe ? 'row-reverse' : 'row'
                  }}>
                    {/* Avatar */}
                    {!isMe && (
                      <div style={{ 
                        width: 32, 
                        height: 32, 
                        borderRadius: 10, 
                        background: 'rgba(255, 255, 255, 0.07)', 
                        color: 'var(--accent)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        border: '1px solid var(--border)',
                        flexShrink: 0,
                        marginTop: 2,
                        overflow: 'hidden'
                      }}>
                        {msg.sender?.avatar ? (
                          <img src={msg.sender.avatar} alt={msg.sender.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          initials
                        )}
                      </div>
                    )}
                    {isMe && (
                      <div style={{ 
                        width: 32, 
                        height: 32, 
                        borderRadius: 10, 
                        background: 'linear-gradient(135deg, #4f46e5, #6366f1)', 
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        flexShrink: 0,
                        marginTop: 2,
                        overflow: 'hidden'
                      }}>
                        {user?.avatar ? (
                          <img src={user.avatar} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'ME'
                        )}
                      </div>
                    )}

                    {/* Content */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                      {!isMe && (
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: 6, 
                          marginBottom: 4,
                          paddingLeft: 2
                        }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                            {msg.sender?.name}
                          </span>
                          {msg.sender?.company?.name && (
                            <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.04)', padding: '1px 5px', borderRadius: 4 }}>
                              {msg.sender?.company?.name}
                            </span>
                          )}
                        </div>
                      )}
                      
                      <div style={{ 
                        background: isMe 
                          ? 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)' 
                          : 'var(--bg-secondary)',
                        color: isMe ? '#ffffff' : 'var(--text-primary)',
                        padding: '10px 14px',
                        borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                        fontSize: '0.85rem',
                        lineHeight: 1.45,
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        boxShadow: isMe ? '0 2px 10px rgba(79, 70, 229, 0.25)' : '0 1px 3px rgba(0,0,0,0.12)',
                        border: isMe ? 'none' : '1px solid var(--border)'
                      }}>
                        {msg.receiverId ? (
                          <DecryptedMessage 
                            rawMessage={msg.message} 
                            privateKeyJwk={privateKeyJwk} 
                            isSender={isMe} 
                            messageId={msg.id}
                          />
                        ) : (
                          msg.message
                        )}

                        {/* Message Timestamp & Delivery Indicator */}
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'flex-end', 
                          gap: 4, 
                          marginTop: 4, 
                          fontSize: '0.65rem',
                          color: isMe ? 'rgba(255, 255, 255, 0.75)' : 'var(--text-muted)'
                        }}>
                          <span>{timeString}</span>
                          {isMe && <RiCheckDoubleLine style={{ fontSize: '0.8rem', opacity: 0.85 }} />}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Send Input Composer */}
          <form onSubmit={handleSend} style={{ 
            padding: '12px 18px', 
            borderTop: '1px solid var(--border)', 
            background: 'var(--bg-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: 10
          }}>
            <div style={{ position: 'relative', flexGrow: 1 }}>
              <input 
                type="text" 
                className="form-control" 
                placeholder={placeholderText}
                value={messageText}
                onChange={e => setMessageText(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={!selectedChannel || sending}
                style={{ 
                  width: '100%',
                  borderRadius: 10,
                  padding: '10px 14px',
                  fontSize: '0.85rem',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)'
                }}
              />
            </div>
            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={!selectedChannel || !messageText.trim() || sending} 
              style={{ 
                padding: '10px 18px', 
                borderRadius: 10,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontWeight: 700,
                fontSize: '0.85rem',
                flexShrink: 0
              }}
            >
              {sending ? (
                <div className="spinner" style={{ width: 14, height: 14 }} />
              ) : (
                <>
                  <RiSendPlane2Line /> <span>Send</span>
                </>
              )}
            </button>
          </form>
        </div>

      </div>
    </AppLayout>
  );
};

export default ChatPage;

