import { useState } from 'react';
import { Megaphone, CalendarDays, ArrowRight } from 'lucide-react';
import PostComplaint from './PostComplaints';
import ComplaintsList from './ComplaintsList';


const Complaints = () => {
    const [activeTab, setActiveTab] = useState('complaint'); // Default to today's announcements

    const tabHeaderStyle = {
        display: 'flex',
        justifyContent: 'center',
        borderBottom: '1px solid #dee2e6',
        marginBottom: '2rem'
    };

    const tabStyle = {
        padding: '0.75rem 1.5rem',
        cursor: 'pointer',
        fontWeight: '500',
        display: 'flex',
        alignItems: 'center',
        margin: '0 1rem',
        borderBottom: '3px solid transparent'
    };

    const activeTabStyle = {
        ...tabStyle,
        borderBottom: '3px solid #0d6efd',
        color: '#0d6efd'
    };

    return (
        <div style={{ padding: '2rem' }}>
            <h2 style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <Megaphone size={32} style={{ marginRight: '10px' }} /> Complaints
            </h2>

            {/* Tab Headers */}
            <div style={tabHeaderStyle}>
                <div 
                    style={activeTab === 'complaint' ? activeTabStyle : tabStyle}
                    onClick={() => setActiveTab('complaint')}
                >
                    <CalendarDays size={24} style={{ marginRight: '8px' }} /> Post Complaint
                </div>
                <div 
                    style={activeTab === 'complaint-list' ? activeTabStyle : tabStyle}
                    onClick={() => setActiveTab('complaint-list')}
                >
                    <ArrowRight size={24} style={{ marginRight: '8px' }} /> Complaint History
                </div>
            </div>

            {/* Content based on active tab */}
            {activeTab === 'complaint' ? <PostComplaint/> : <ComplaintsList />}
        </div>
    );
};

export default Complaints;