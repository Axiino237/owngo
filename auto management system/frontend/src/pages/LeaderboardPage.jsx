import React, { useState, useEffect, useCallback } from 'react';
import AppLayout from '../components/AppLayout';
import api from '../api/axios';
import {
  RiTrophyLine,
  RiMedalLine,
  RiFilter3Line,
  RiSearchLine,
  RiUserStarLine
} from 'react-icons/ri';

const LeaderboardPage = () => {
  const [period, setPeriod] = useState('all');
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [overallTop3, setOverallTop3] = useState([]);
  const [companyStats, setCompanyStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchLeaderboard = useCallback(async (selectedPeriod) => {
    setLoading(true);
    try {
      const res = await api.get(`/dashboard/leaderboard?performersPreset=${selectedPeriod}`);
      if (res.data?.success) {
        setLeaderboardData(res.data.leaderboard || []);
        setOverallTop3(res.data.overallTop3 || []);
        setCompanyStats(res.data.companyStats || null);
      }
    } catch (err) {
      console.error('Failed to fetch leaderboard:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeaderboard(period);
  }, [period, fetchLeaderboard]);

  const handlePeriodChange = (newPeriod) => {
    setPeriod(newPeriod);
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  const filteredMembers = leaderboardData.filter(m =>
    m.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.role?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AppLayout title="Sales Leaderboard">
      <div style={{ maxWidth: 1400, margin: '0 auto', paddingBottom: 40 }}>
        
        {/* Header Banner */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(30, 27, 75, 0.8) 0%, rgba(15, 23, 42, 0.95) 100%)',
          border: '1px solid rgba(99, 102, 241, 0.25)',
          borderRadius: 16,
          padding: '24px 28px',
          marginBottom: 24,
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.25)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{
                width: 52,
                height: 52,
                borderRadius: 14,
                background: 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)',
                color: '#0f172a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.8rem',
                boxShadow: '0 4px 16px rgba(234, 179, 8, 0.35)'
              }}>
                <RiTrophyLine />
              </div>
              <div>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f8fafc', margin: '0 0 4px 0' }}>
                  Sales Performance Leaderboard
                </h1>
                <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: 0 }}>
                  All sales members ranked top to bottom by highest closed revenue and average deal value
                </p>
              </div>
            </div>

            {/* Live Summary Chips */}
            {companyStats && (
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <div style={{
                  background: 'rgba(15, 23, 42, 0.7)',
                  border: '1px solid var(--border)',
                  borderRadius: 10,
                  padding: '8px 14px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 700 }}>Total Revenue</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#38bdf8' }}>{formatCurrency(companyStats.totalRevenue)}</div>
                </div>
                <div style={{
                  background: 'rgba(15, 23, 42, 0.7)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  borderRadius: 10,
                  padding: '8px 14px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 700 }}>Closed Deals</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#34d399' }}>{companyStats.totalDeals} deals</div>
                </div>
                <div style={{
                  background: 'rgba(15, 23, 42, 0.7)',
                  border: '1px solid rgba(168, 85, 247, 0.3)',
                  borderRadius: 10,
                  padding: '8px 14px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 700 }}>Avg Deal Value</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#c084fc' }}>{formatCurrency(companyStats.avgDealValue)}</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 🏆 Top 3 Overall Champions Section Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
          paddingLeft: 4
        }}>
          <h2 style={{
            fontSize: '0.95rem',
            fontWeight: 800,
            color: '#f8fafc',
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            textTransform: 'uppercase',
            letterSpacing: '0.04em'
          }}>
            <span style={{
              width: 26,
              height: 26,
              borderRadius: 8,
              background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.25), rgba(202, 138, 4, 0.15))',
              border: '1px solid rgba(234, 179, 8, 0.4)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#eab308',
              fontSize: '0.9rem'
            }}>
              🏆
            </span>
            Overall Sales Champions (All-Time)
          </h2>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>
            Ranked by Total Revenue &amp; Deal Performance
          </span>
        </div>

        {/* 🏆 Top 3 Overall Champions Podium Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 16,
          marginBottom: 28
        }}>
          {overallTop3.map((emp) => {
            const isGold = emp.rank === 1;
            const isSilver = emp.rank === 2;
            const borderCol = isGold ? 'rgba(234, 179, 8, 0.5)' : isSilver ? 'rgba(148, 163, 184, 0.5)' : 'rgba(217, 119, 6, 0.5)';
            const bgGrad = isGold
              ? 'linear-gradient(145deg, rgba(234, 179, 8, 0.15) 0%, rgba(202, 138, 4, 0.04) 100%)'
              : isSilver
              ? 'linear-gradient(145deg, rgba(148, 163, 184, 0.15) 0%, rgba(100, 116, 139, 0.04) 100%)'
              : 'linear-gradient(145deg, rgba(217, 119, 6, 0.15) 0%, rgba(180, 83, 9, 0.04) 100%)';
            const badgeColor = isGold ? '#eab308' : isSilver ? '#cbd5e1' : '#f59e0b';
            const badgeText = isGold ? '🥇 #1 Champion' : isSilver ? '🥈 #2 Runner-Up' : '🥉 #3 Performer';

            return (
              <div
                key={emp.userId}
                style={{
                  background: bgGrad,
                  border: `1px solid ${borderCol}`,
                  borderRadius: 16,
                  padding: '20px 22px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  position: 'relative',
                  boxShadow: isGold ? '0 10px 28px rgba(234, 179, 8, 0.12)' : 'none'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <span style={{
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    color: badgeColor,
                    background: 'rgba(0, 0, 0, 0.4)',
                    padding: '4px 12px',
                    borderRadius: 14,
                    border: `1px solid ${borderCol}`,
                    whiteSpace: 'nowrap'
                  }}>
                    {badgeText}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>
                    {emp.revenueShare}% of Overall Total
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                  <div style={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    background: isGold ? 'rgba(234, 179, 8, 0.25)' : 'rgba(99, 102, 241, 0.25)',
                    color: badgeColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '1.2rem',
                    border: `2px solid ${badgeColor}`,
                    flexShrink: 0
                  }}>
                    {emp.avatar ? (
                      <img src={emp.avatar} alt={emp.name} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                      emp.name ? emp.name.charAt(0).toUpperCase() : '?'
                    )}
                  </div>
                  <div style={{ overflow: 'hidden' }}>
                    <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {emp.name}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                      {emp.role}
                    </div>
                  </div>
                </div>

                {/* Metrics Box */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '0.9fr 1.3fr 1.3fr',
                  gap: 6,
                  padding: '10px 10px',
                  background: 'var(--bg-secondary)',
                  borderRadius: 12,
                  border: '1px solid var(--border)',
                  overflow: 'hidden'
                }}>
                  <div style={{ minWidth: 0 }}>
                    <span style={{ fontSize: '0.625rem', color: '#94a3b8', display: 'block', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      Closed Deals
                    </span>
                    <span style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--success)', whiteSpace: 'nowrap' }}>
                      {emp.salesCount} <span style={{ fontSize: '0.6875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>deals</span>
                    </span>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <span style={{ fontSize: '0.625rem', color: '#94a3b8', display: 'block', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      Avg Deal Value
                    </span>
                    <span style={{ fontSize: '0.825rem', fontWeight: 800, color: '#a855f7', whiteSpace: 'nowrap' }}>
                      {formatCurrency(emp.avgDealValue)}
                    </span>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <span style={{ fontSize: '0.625rem', color: '#94a3b8', display: 'block', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      Total Revenue
                    </span>
                    <span style={{ fontSize: '0.825rem', fontWeight: 800, color: '#38bdf8', whiteSpace: 'nowrap' }}>
                      {formatCurrency(emp.totalRevenue)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Filter Controls Bar */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 20,
          background: 'rgba(15, 23, 42, 0.6)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: '12px 18px'
        }}>
          {/* Period Pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', marginRight: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
              <RiFilter3Line /> Filter Period:
            </span>
            <button
              type="button"
              onClick={() => handlePeriodChange('all')}
              style={{
                padding: '6px 14px',
                borderRadius: 20,
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                border: period === 'all' ? '1px solid #6366f1' : '1px solid var(--border)',
                background: period === 'all' ? 'rgba(99, 102, 241, 0.25)' : 'rgba(255, 255, 255, 0.04)',
                color: period === 'all' ? '#a5b4fc' : 'var(--text-secondary)',
                transition: 'all 0.15s ease'
              }}
            >
              🗓️ All Time
            </button>
            <button
              type="button"
              onClick={() => handlePeriodChange('this_month')}
              style={{
                padding: '6px 14px',
                borderRadius: 20,
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                border: period === 'this_month' ? '1px solid #6366f1' : '1px solid var(--border)',
                background: period === 'this_month' ? 'rgba(99, 102, 241, 0.25)' : 'rgba(255, 255, 255, 0.04)',
                color: period === 'this_month' ? '#a5b4fc' : 'var(--text-secondary)',
                transition: 'all 0.15s ease'
              }}
            >
              📅 This Month
            </button>
            <button
              type="button"
              onClick={() => handlePeriodChange('last_month')}
              style={{
                padding: '6px 14px',
                borderRadius: 20,
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                border: period === 'last_month' ? '1px solid #6366f1' : '1px solid var(--border)',
                background: period === 'last_month' ? 'rgba(99, 102, 241, 0.25)' : 'rgba(255, 255, 255, 0.04)',
                color: period === 'last_month' ? '#a5b4fc' : 'var(--text-secondary)',
                transition: 'all 0.15s ease'
              }}
            >
              📅 Last Month
            </button>
            <button
              type="button"
              onClick={() => handlePeriodChange('this_year')}
              style={{
                padding: '6px 14px',
                borderRadius: 20,
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                border: period === 'this_year' ? '1px solid #6366f1' : '1px solid var(--border)',
                background: period === 'this_year' ? 'rgba(99, 102, 241, 0.25)' : 'rgba(255, 255, 255, 0.04)',
                color: period === 'this_year' ? '#a5b4fc' : 'var(--text-secondary)',
                transition: 'all 0.15s ease'
              }}
            >
              📆 This Year
            </button>
            <button
              type="button"
              onClick={() => handlePeriodChange('last_year')}
              style={{
                padding: '6px 14px',
                borderRadius: 20,
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                border: period === 'last_year' ? '1px solid #6366f1' : '1px solid var(--border)',
                background: period === 'last_year' ? 'rgba(99, 102, 241, 0.25)' : 'rgba(255, 255, 255, 0.04)',
                color: period === 'last_year' ? '#a5b4fc' : 'var(--text-secondary)',
                transition: 'all 0.15s ease'
              }}
            >
              📆 Last Year
            </button>
            <select
              value={['this_month', 'last_month', 'this_year', 'last_year', 'all'].includes(period) ? '' : period}
              onChange={(e) => { if (e.target.value) handlePeriodChange(e.target.value); }}
              style={{
                padding: '6px 12px',
                borderRadius: 20,
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                border: !['this_month', 'last_month', 'this_year', 'last_year', 'all'].includes(period) ? '1px solid #6366f1' : '1px solid var(--border)',
                background: !['this_month', 'last_month', 'this_year', 'last_year', 'all'].includes(period) ? 'rgba(99, 102, 241, 0.25)' : 'rgba(255, 255, 255, 0.04)',
                color: !['this_month', 'last_month', 'this_year', 'last_year', 'all'].includes(period) ? '#a5b4fc' : 'var(--text-secondary)',
                outline: 'none'
              }}
            >
              <option value="" style={{ background: '#0f172a', color: '#94a3b8' }}>More Months...</option>
              <option value="2026-10" style={{ background: '#0f172a', color: '#f8fafc' }}>Oct 2026</option>
              <option value="2026-09" style={{ background: '#0f172a', color: '#f8fafc' }}>Sep 2026</option>
              <option value="2026-08" style={{ background: '#0f172a', color: '#f8fafc' }}>Aug 2026</option>
              <option value="2026-07" style={{ background: '#0f172a', color: '#f8fafc' }}>Jul 2026</option>
              <option value="2026-06" style={{ background: '#0f172a', color: '#f8fafc' }}>Jun 2026</option>
              <option value="2026-05" style={{ background: '#0f172a', color: '#f8fafc' }}>May 2026</option>
              <option value="2024" style={{ background: '#0f172a', color: '#f8fafc' }}>Year 2024</option>
            </select>
          </div>

          {/* Search Input */}
          <div style={{ position: 'relative', minWidth: 220 }}>
            <RiSearchLine style={{ position: 'absolute', left: 10, top: 10, color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search sales staff..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 12px 6px 32px',
                borderRadius: 8,
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
                fontSize: '0.8rem',
                outline: 'none'
              }}
            />
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px' }}>
            <div className="spinner" style={{ margin: '0 auto 16px' }} />
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Loading sales leaderboard...</div>
          </div>
        ) : leaderboardData.length === 0 ? (
          <div style={{
            padding: '48px 24px',
            textAlign: 'center',
            background: 'var(--card-bg)',
            borderRadius: 14,
            border: '1px dashed var(--border)'
          }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 10 }}>🎯</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
              No Sales Recorded for this Period
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Try selecting "All Time" or another month above to view past performances.
            </div>
          </div>
        ) : (
          /* Complete Sales Rankings List (All Staff Top to Bottom) */
          <div className="card" style={{ overflow: 'hidden', border: '1px solid var(--border)' }}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  Full Company Sales Rankings
                </h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  All {filteredMembers.length} sales team members ordered from highest total revenue to lowest
                </span>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    borderBottom: '1px solid var(--border)',
                    fontSize: '0.72rem',
                    textTransform: 'uppercase',
                    color: 'var(--text-muted)',
                    letterSpacing: '0.04em'
                  }}>
                    <th style={{ padding: '14px 18px', width: 90, textAlign: 'center' }}>Rank</th>
                    <th style={{ padding: '14px 18px' }}>Sales Member</th>
                    <th style={{ padding: '14px 18px', textAlign: 'center' }}>Closed Deals</th>
                    <th style={{ padding: '14px 18px', textAlign: 'right' }}>Average Deal Value</th>
                    <th style={{ padding: '14px 18px', textAlign: 'right' }}>Total Revenue</th>
                    <th style={{ padding: '14px 18px', width: 180 }}>Company Share</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMembers.map((member) => {
                    const isTop3 = member.rank <= 3;

                    return (
                      <tr
                        key={member.userId}
                        style={{
                          borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                          background: isTop3 ? 'rgba(99, 102, 241, 0.02)' : 'transparent',
                          transition: 'background 0.15s ease'
                        }}
                      >
                        {/* Rank Badge Column - Perfectly Aligned & Centered */}
                        <td style={{ padding: '14px 18px', width: 90, textAlign: 'center', verticalAlign: 'middle' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {member.rank === 1 ? (
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 5,
                                padding: '4px 12px',
                                borderRadius: 20,
                                fontSize: '0.8rem',
                                fontWeight: 800,
                                color: '#eab308',
                                background: 'rgba(234, 179, 8, 0.15)',
                                border: '1px solid rgba(234, 179, 8, 0.45)',
                                whiteSpace: 'nowrap',
                                lineHeight: 1,
                                boxShadow: '0 2px 8px rgba(234, 179, 8, 0.2)'
                              }}>
                                <span style={{ fontSize: '0.95rem', lineHeight: 1 }}>🥇</span>
                                <span style={{ lineHeight: 1 }}>#1</span>
                              </span>
                            ) : member.rank === 2 ? (
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 5,
                                padding: '4px 12px',
                                borderRadius: 20,
                                fontSize: '0.8rem',
                                fontWeight: 800,
                                color: '#cbd5e1',
                                background: 'rgba(148, 163, 184, 0.15)',
                                border: '1px solid rgba(148, 163, 184, 0.45)',
                                whiteSpace: 'nowrap',
                                lineHeight: 1
                              }}>
                                <span style={{ fontSize: '0.95rem', lineHeight: 1 }}>🥈</span>
                                <span style={{ lineHeight: 1 }}>#2</span>
                              </span>
                            ) : member.rank === 3 ? (
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 5,
                                padding: '4px 12px',
                                borderRadius: 20,
                                fontSize: '0.8rem',
                                fontWeight: 800,
                                color: '#f59e0b',
                                background: 'rgba(217, 119, 6, 0.15)',
                                border: '1px solid rgba(217, 119, 6, 0.45)',
                                whiteSpace: 'nowrap',
                                lineHeight: 1
                              }}>
                                <span style={{ fontSize: '0.95rem', lineHeight: 1 }}>🥉</span>
                                <span style={{ lineHeight: 1 }}>#3</span>
                              </span>
                            ) : (
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: 30,
                                height: 30,
                                borderRadius: '50%',
                                fontSize: '0.78rem',
                                fontWeight: 700,
                                color: 'var(--text-secondary)',
                                background: 'rgba(255, 255, 255, 0.04)',
                                border: '1px solid var(--border)',
                                lineHeight: 1
                              }}>
                                {member.rank}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Member Info Column */}
                        <td style={{ padding: '14px 18px', verticalAlign: 'middle' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{
                              width: 38,
                              height: 38,
                              borderRadius: '50%',
                              background: 'rgba(99, 102, 241, 0.2)',
                              color: 'var(--accent)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 800,
                              fontSize: '0.95rem',
                              border: isTop3 ? (member.rank === 1 ? '2px solid #eab308' : member.rank === 2 ? '2px solid #cbd5e1' : '2px solid #f59e0b') : '1px solid var(--border)',
                              flexShrink: 0
                            }}>
                              {member.avatar ? (
                                <img src={member.avatar} alt={member.name} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                              ) : (
                                member.name ? member.name.charAt(0).toUpperCase() : '?'
                              )}
                            </div>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                                {member.name}
                              </div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                                {member.role}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Closed Deals Column */}
                        <td style={{ padding: '14px 18px', textAlign: 'center', verticalAlign: 'middle' }}>
                          <span style={{
                            fontSize: '0.95rem',
                            fontWeight: 800,
                            color: member.salesCount > 0 ? 'var(--success)' : 'var(--text-muted)'
                          }}>
                            {member.salesCount}
                          </span>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: 4 }}>
                            deals
                          </span>
                        </td>

                        {/* Average Deal Value Column */}
                        <td style={{ padding: '14px 18px', textAlign: 'right', verticalAlign: 'middle' }}>
                          <span style={{
                            fontSize: '0.95rem',
                            fontWeight: 800,
                            color: member.avgDealValue > 0 ? '#a855f7' : 'var(--text-muted)'
                          }}>
                            {formatCurrency(member.avgDealValue)}
                          </span>
                        </td>

                        {/* Total Revenue Column */}
                        <td style={{ padding: '14px 18px', textAlign: 'right', verticalAlign: 'middle' }}>
                          <span style={{
                            fontSize: '1rem',
                            fontWeight: 800,
                            color: member.totalRevenue > 0 ? '#38bdf8' : 'var(--text-muted)'
                          }}>
                            {formatCurrency(member.totalRevenue)}
                          </span>
                        </td>

                        {/* Progress Bar & Share Column */}
                        <td style={{ padding: '14px 18px', verticalAlign: 'middle' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{
                              flex: 1,
                              height: 6,
                              borderRadius: 3,
                              background: 'rgba(255, 255, 255, 0.08)',
                              overflow: 'hidden'
                            }}>
                              <div style={{
                                width: `${member.revenueShare || 0}%`,
                                height: '100%',
                                background: isTop3
                                  ? 'linear-gradient(90deg, #eab308 0%, #38bdf8 100%)'
                                  : 'linear-gradient(90deg, #6366f1 0%, #a855f7 100%)',
                                borderRadius: 3
                              }} />
                            </div>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600, minWidth: 32, textAlign: 'right' }}>
                              {member.revenueShare || 0}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default LeaderboardPage;
