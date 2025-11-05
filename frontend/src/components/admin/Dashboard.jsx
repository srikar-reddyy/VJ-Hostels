import { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { useAdmin } from '../../context/AdminContext';
import { Users, Bell, Clock, MessageSquare, ChevronRight, TrendingUp } from 'lucide-react';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [screenSize, setScreenSize] = useState('desktop');
  const { token } = useAdmin();

  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      if (width <= 480) setScreenSize('mobile');
      else if (width <= 768) setScreenSize('tablet');
      else setScreenSize('desktop');
    };
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${import.meta.env.VITE_SERVER_URL}/admin-api/dashboard-stats`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setStats(response.data);
      } catch (err) {
        setError('Failed to load dashboard data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardStats();
  }, [token]);

  if (loading) {
    return (
      <div style={styles.loaderContainer}>
        <div style={styles.spinner} />
        <p style={styles.loadingText}>Loading dashboard...</p>
        <style>{keyframes}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.errorBox}>
        <MessageSquare size={20} />
        <span>{error}</span>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h2 style={styles.title}>Dashboard Overview</h2>
        <p style={styles.subtitle}>Welcome back! Here's what's happening in your hostel today.</p>
      </header>

      {/* Stats Cards */}
      <div style={styles.grid(screenSize)}>
        <StatCard
          title="Total Students"
          value={stats?.totalStudents || 0}
          icon={<Users size={24} />}
          color="#3B82F6"
          subtitle="Active students in hostel"
          link="/admin/students"
          trend="+12%"
        />
        <StatCard
          title="Announcements"
          value={stats?.totalAnnouncements || 0}
          icon={<Bell size={24} />}
          color="#10B981"
          subtitle="Total announcements"
          link="/admin/announcements"
          trend="+5%"
        />
        <StatCard
          title="Pending Outpasses"
          value={stats?.pendingOutpassesCount || 0}
          icon={<Clock size={24} />}
          color="#F59E0B"
          subtitle="Awaiting approval"
          link="/admin/outpasses"
          trend="3 new"
        />
        <StatCard
          title="Active Complaints"
          value={stats?.activeComplaintsCount || 0}
          icon={<MessageSquare size={24} />}
          color="#EF4444"
          subtitle="To be resolved"
          link="/admin/complaints"
          trend="-2 today"
        />
      </div>

      {/* Recent Activities */}
      <div style={styles.activityGrid(screenSize)}>
        <RecentList
          title="Recent Complaints"
          icon={<MessageSquare size={20} style={{ color: '#4F46E5' }} />}
          data={stats?.recentComplaints}
          emptyText="No recent complaints"
          type="complaint"
          link="/admin/complaints"
        />

        <RecentList
          title="Recent Outpass Requests"
          icon={<Clock size={20} style={{ color: '#4F46E5' }} />}
          data={stats?.recentOutpasses}
          emptyText="No recent outpass requests"
          type="outpass"
          link="/admin/outpasses"
        />
      </div>
    </div>
  );
};

// ------------------------ Components ------------------------

const StatCard = ({ title, value, icon, color, subtitle, link, trend }) => (
  <div
    style={{
      ...styles.card,
      borderLeft: `5px solid ${color}`,
    }}
    onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
    onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
  >
    <div style={styles.cardHeader}>
      <div>
        <p style={styles.cardTitle}>{title}</p>
        <h3 style={styles.cardValue}>{value}</h3>
      </div>
      <div style={{ ...styles.iconBox, backgroundColor: `${color}15`, color }}>{icon}</div>
    </div>

    <div style={styles.cardFooter}>
      <p style={styles.subtitleSmall}>{subtitle}</p>
      {trend && (
        <span style={styles.trend}>
          <TrendingUp size={12} /> {trend}
        </span>
      )}
    </div>

    <Link to={link} style={{ ...styles.detailsLink, color }}>
      View Details <ChevronRight size={16} />
    </Link>
  </div>
);

const RecentList = ({ title, icon, data, emptyText, type, link }) => (
  <div style={styles.listContainer}>
    <div style={styles.listHeader}>
      <h3 style={styles.listTitle}>
        {icon} {title}
      </h3>
    </div>
    <div style={{ padding: '1.25rem' }}>
      {data?.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {data.map((item) => (
            <div
              key={item._id}
              style={styles.listItem}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#C7D2FE')}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#E5E7EB')}
            >
              <div style={styles.itemHeader}>
                <h4 style={styles.itemTitle}>{type === 'complaint' ? item.category : item.name}</h4>
                <span style={styles.statusBadge(item.status)}>{item.status}</span>
              </div>
              <p style={styles.itemText}>
                {type === 'complaint'
                  ? item.description.substring(0, 100)
                  : `Type: ${item.type} | Reason: ${item.reason.substring(0, 50)}`}
              </p>
              <p style={styles.itemMeta}>
                {type === 'complaint'
                  ? `By: ${item.complaintBy}`
                  : `Out: ${new Date(item.outTime).toLocaleString()} | In: ${new Date(
                      item.inTime
                    ).toLocaleString()}`}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div style={styles.emptyBox}>
          {icon}
          <p>{emptyText}</p>
        </div>
      )}

      <Link to={link} style={styles.primaryBtn}>
        View All <ChevronRight size={16} />
      </Link>
    </div>
  </div>
);

// ------------------------ Styles ------------------------

const styles = {
  container: { padding: '0', background: 'transparent', minHeight: 'auto' },
  header: { marginBottom: '2rem' },
  title: { fontSize: '1.875rem', fontWeight: '700', color: '#1E293B' },
  subtitle: { color: '#64748B', fontSize: '0.95rem' },
  loaderContainer: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', flexDirection: 'column', gap: '1rem' },
  spinner: { width: '48px', height: '48px', border: '4px solid #E0E7FF', borderTop: '4px solid #4F46E5', borderRadius: '50%', animation: 'spin 1s linear infinite' },
  loadingText: { color: '#64748B', fontSize: '0.95rem' },
  errorBox: { backgroundColor: '#FEE2E2', border: '1px solid #FCA5A5', borderRadius: '12px', padding: '1rem 1.25rem', color: '#991B1B', display: 'flex', alignItems: 'center', gap: '0.75rem' },
  grid: (screenSize) => ({ 
    display: 'grid', 
    gridTemplateColumns: screenSize === 'mobile' ? '1fr' : screenSize === 'tablet' ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', 
    gap: screenSize === 'mobile' ? '1rem' : '1.5rem', 
    marginBottom: '2rem' 
  }),
  activityGrid: (screenSize) => ({ 
    display: 'grid', 
    gridTemplateColumns: screenSize === 'mobile' ? '1fr' : 'repeat(2, 1fr)', 
    gap: screenSize === 'mobile' ? '1rem' : '1.5rem' 
  }),
  card: { background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #E5E7EB', transition: 'all 0.3s ease' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: '0.875rem', color: '#64748B', margin: 0 },
  cardValue: { fontSize: '2rem', fontWeight: '700', color: '#1E293B' },
  iconBox: { padding: '0.75rem', borderRadius: '12px' },
  cardFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem' },
  subtitleSmall: { fontSize: '0.75rem', color: '#94A3B8' },
  trend: { fontSize: '0.75rem', color: '#10B981', display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: '600' },
  detailsLink: { fontSize: '0.875rem', fontWeight: '600', textDecoration: 'none', marginTop: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' },
  listContainer: { background: 'white', borderRadius: '12px', border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' },
  listHeader: { padding: '1.25rem', background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' },
  listTitle: { fontSize: '1.125rem', fontWeight: '600', color: '#1E293B', display: 'flex', alignItems: 'center', gap: '0.5rem' },
  listItem: { padding: '1rem', background: '#F9FAFB', borderRadius: '8px', border: '1px solid #E5E7EB', transition: 'all 0.2s ease' },
  itemHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' },
  itemTitle: { fontSize: '0.95rem', fontWeight: '600', color: '#1E293B', margin: 0 },
  itemText: { fontSize: '0.875rem', color: '#64748B', margin: '0.5rem 0' },
  itemMeta: { fontSize: '0.75rem', color: '#94A3B8' },
  emptyBox: { textAlign: 'center', padding: '3rem 1rem', color: '#94A3B8' },
  primaryBtn: { display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginTop: '1rem', padding: '0.625rem 1.25rem', backgroundColor: '#4F46E5', color: 'white', borderRadius: '8px', textDecoration: 'none', fontSize: '0.875rem', fontWeight: '500', transition: 'all 0.2s ease' },
  statusBadge: (status) => ({
    padding: '0.25rem 0.75rem',
    borderRadius: '12px',
    fontSize: '0.75rem',
    fontWeight: '600',
    backgroundColor:
      status === 'active' || status === 'pending'
        ? '#FEF3C7'
        : status === 'accepted'
        ? '#D1FAE5'
        : '#FEE2E2',
    color:
      status === 'active' || status === 'pending'
        ? '#92400E'
        : status === 'accepted'
        ? '#065F46'
        : '#991B1B',
  }),
};

const keyframes = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

export default Dashboard;
