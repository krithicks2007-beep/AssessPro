import React from 'react';
import {
  FileText,
  Users,
  CheckCircle2,
  BarChart2,
  Clock,
  Plus,
  Send,
  Edit3,
  UserPlus,
  ChevronDown,
  Settings as SettingsIcon
} from 'lucide-react';
import { StaffCircleRing } from '../shared/CircleRing';

/**
 * Staff Dashboard Tab
 * Shows KPI cards, performance bar chart, group-wise rings, recent tests table, and activity feed.
 */

const groupColors = ['#1d72fe', '#10b981', '#8b5cf6', '#f97316', '#ec4899', '#06b6d4'];

export default function Dashboard({
  groups,
  tests,
  totalTestsCount,
  publishedCount,
  draftCount,
  activeTestsCount,
  onManageGroups,
  onCreateTest,
  onViewSubmissions
}) {
  return (
    <div className="dashboard-content">
      {/* Row 1: 4 KPI Cards */}
      <div className="kpi-row">
        <div className="kpi-card">
          <div className="kpi-icon-box kpi-icon-blue">
            <FileText size={24} />
          </div>
        <div className="kpi-info">
          <span className="kpi-val">{totalTestsCount}</span>
          <span className="kpi-label">Total Tests</span>
          <span className="kpi-sub">{publishedCount} Published &nbsp;|&nbsp; {draftCount} Drafts</span>
        </div>
      </div>

      <div className="kpi-card">
        <div className="kpi-icon-box kpi-icon-green">
          <Users size={24} />
        </div>
        <div className="kpi-info">
          <span className="kpi-val">0</span>
          <span className="kpi-label">Total Students</span>
          <span className="kpi-sub">Across All Groups</span>
        </div>
      </div>

      <div className="kpi-card">
        <div className="kpi-icon-box kpi-icon-purple">
          <CheckCircle2 size={24} />
        </div>
        <div className="kpi-info">
          <span className="kpi-val">{activeTestsCount}</span>
          <span className="kpi-label">Active Tests</span>
          <span className="kpi-sub">Currently Running</span>
        </div>
      </div>

      <div className="kpi-card">
        <div className="kpi-icon-box kpi-icon-orange">
          <BarChart2 size={24} />
        </div>
        <div className="kpi-info">
          <span className="kpi-val">0%</span>
          <span className="kpi-label">Average Score</span>
          <span className="kpi-sub">All Tests</span>
        </div>
      </div>
    </div>

    {/* Row 2: Performance Bar Chart & Group-wise Circular Rings */}
    <div className="grid-2col">
      {/* Left: Bar Chart */}
      <div className="chart-card">
        <div className="chart-card-header">
          <div className="chart-card-title">
            <BarChart2 size={18} color="#1d72fe" />
            <span>Test Performance Overview</span>
          </div>
          <div className="select-pill" style={{ padding: '0.25rem 0.55rem', fontSize: '0.74rem' }}>
            <span>Last 6 Months</span>
            <ChevronDown size={12} />
          </div>
        </div>

        <div className="bar-chart-container">
          {[
            { month: 'Apr', value: 0 },
            { month: 'May', value: 0 },
            { month: 'Jun', value: 0 },
            { month: 'Jul', value: 0 },
            { month: 'Aug', value: 0 },
            { month: 'Sep', value: 0 }
          ].map(({ month, value }) => (
            <div key={month} className="bar-col">
              <span className="bar-value">{value}%</span>
              <div className="bar-fill-blue" style={{ height: `${value}%` }} />
              <span className="bar-month">{month}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right: Dynamic Group-wise Circular Rings */}
      <div className="chart-card">
        <div className="chart-card-header">
          <div className="chart-card-title">
            <Clock size={18} color="#1d72fe" />
            <span>Group-wise Performance ({groups.length} Groups)</span>
          </div>
          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
            <button
              className="select-pill"
              onClick={onManageGroups}
              style={{ background: '#eff6ff', color: '#1d72fe', borderColor: '#bfdbfe' }}
            >
              <SettingsIcon size={12} />
              <span>Manage Groups</span>
            </button>
            <div className="select-pill" style={{ padding: '0.25rem 0.55rem', fontSize: '0.74rem' }}>
              <span>Percentage</span>
              <ChevronDown size={12} />
            </div>
          </div>
        </div>

        <div className="rings-container" style={{ flexWrap: 'wrap', gap: '1rem' }}>
          {groups.length === 0 ? (
            <div style={{ color: '#9ca3af', fontSize: '0.85rem', padding: '1rem' }}>No groups found.</div>
          ) : groups.map((group, idx) => {
            const ringColor = group.color || groupColors[idx % groupColors.length];
            const avg = 0; // Pure live data calculation should go here
            const groupTestsCount = tests.filter(t => t.group_id === group.id).length;

            return (
              <div key={group.id} className="ring-item" style={{ minWidth: '110px' }}>
                <StaffCircleRing percentage={avg} color={ringColor} />
                <div className="ring-label">Group {group.group_number || idx + 1}</div>
                <div className="ring-sub" title={group.name} style={{ maxWidth: '120px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {group.name}
                </div>
                <div className="ring-tests">({groupTestsCount} Tests)</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>

    {/* Row 3: Recent Tests Table & Recent Activity */}
    <div className="grid-2col">
      {/* Left: Recent Tests Table */}
      <div className="table-card">
        <div className="table-header-action">
          <div className="chart-card-title">
            <FileText size={18} color="#1d72fe" />
            <span>Recent Tests ({tests.length || 5})</span>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              className="select-pill"
              onClick={onCreateTest}
              style={{ fontSize: '0.74rem', padding: '0.25rem 0.5rem' }}
            >
              <Plus size={13} />
              New Test
            </button>
            <a href="#viewall" className="view-all-link">View All</a>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="custom-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Test Title</th>
                <th>Group</th>
                <th>Date & Time</th>
                <th>Students</th>
                <th>Avg. Score</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {tests.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                    No recent tests found.
                  </td>
                </tr>
              ) : (
                tests.slice(0, 6).map((test, idx) => (
                  <tr key={test.id || idx}>
                    <td>{idx + 1}</td>
                    <td style={{ fontWeight: 600 }}>{test.title}</td>
                    <td>
                      <span className="group-badge-blue">
                        {test.groups ? `Group ${test.groups.group_number}: ${test.groups.name}` : (test.group_name || 'Group')}
                      </span>
                    </td>
                    <td style={{ color: '#6b7280', fontSize: '0.74rem' }}>
                      {test.scheduled_date ? new Date(test.scheduled_date).toLocaleDateString() : (test.date || 'Unknown')}
                    </td>
                    <td>{test.students || 0}</td>
                    <td style={{ fontWeight: 700 }}>{test.avg || '0%'}</td>
                    <td>
                      <span className={test.status === 'published' ? 'status-pill-published' : 'status-pill-completed'}>
                        {test.status === 'published' ? 'Published' : (test.status || 'Draft')}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn-table-view"
                        onClick={() => onViewSubmissions(test)}
                        title="View student marks & anti-cheating report"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Right: Recent Activity Feed */}
      <div className="table-card">
        <div className="table-header-action">
          <div className="chart-card-title">
            <Clock size={18} color="#1d72fe" />
            <span>Recent Activity</span>
          </div>
          <a href="#viewall" className="view-all-link">View All</a>
        </div>

        <div className="activity-feed">
          <div style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af', fontSize: '0.85rem' }}>
            No recent activity recorded.
          </div>
        </div>
      </div>
    </div>
  </div>
  );
}
