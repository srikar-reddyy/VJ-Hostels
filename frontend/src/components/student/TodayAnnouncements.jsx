// TodayAnnouncements.jsx
import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const TodayAnnouncements = () => {
    const [todayAnnouncements, setTodayAnnouncements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [expandedAnnouncements, setExpandedAnnouncements] = useState(new Set());
    const navigate = useNavigate();

    useEffect(() => {
        const fetchTodayAnnouncements = async () => {
            try {
                setLoading(true);
                const response = await axios.get(`${import.meta.env.VITE_SERVER_URL}/student-api/announcements`);
                const data = Array.isArray(response.data) ? response.data.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) : [];
                setTodayAnnouncements(data);
                setLoading(false);
            } catch (error) {
                console.error('Error fetching today\'s announcements:', error);
                setError('Failed to load today\'s announcements');
                setLoading(false);
            }
        };

        fetchTodayAnnouncements();
    }, []);

    // Use IntersectionObserver to only mark announcements as seen when they enter the user's view.
    const seenLocal = useRef(new Set()); // IDs already marked this session
    const pendingRef = useRef(new Set()); // IDs pending to send to server
    const timerRef = useRef(null);

    useEffect(() => {
        if (!todayAnnouncements || todayAnnouncements.length === 0) return;

        const scheduleFlush = () => {
            if (timerRef.current) clearTimeout(timerRef.current);
            timerRef.current = setTimeout(flushPending, 400);
        };

        const flushPending = async () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }
            const ids = Array.from(pendingRef.current);
            if (ids.length === 0) return;
            // clear pending immediately so new entries can accumulate
            pendingRef.current.clear();

            try {
                const token = localStorage.getItem('token');
                if (!token) return;
                await axios.put(`${import.meta.env.VITE_SERVER_URL}/student-api/announcements/mark-seen`, { ids }, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                // mark locally as seen to avoid re-sending
                ids.forEach(id => seenLocal.current.add(id));
            } catch (err) {
                console.warn('Failed to mark announcements as seen', err?.response?.data || err.message || err);
                // On failure, re-add ids to pending so they will be retried next time
                ids.forEach(id => pendingRef.current.add(id));
            }
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
                    const id = entry.target.dataset.id;
                    if (!id) return;
                    if (!seenLocal.current.has(id) && !pendingRef.current.has(id)) {
                        pendingRef.current.add(id);
                        scheduleFlush();
                    }
                }
            });
        }, { threshold: [0.5] });

        // Observe all announcement card elements
        const nodes = Array.from(document.querySelectorAll('.announcement-card[data-id]'));
        nodes.forEach(n => observer.observe(n));

        // cleanup: flush remaining pending and disconnect observer
        return () => {
            observer.disconnect();
            flushPending();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [todayAnnouncements]);

    // Helper function to check if text needs truncation (approximately 3 lines = 200 characters)
    const shouldTruncate = (text) => text.length > 200;

    // Helper function to truncate text to 3 lines
    const truncateText = (text, maxLength = 200) => {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength).trim() + '...';
    };

    // Decode stored "\\n" sequences back to real newlines for display
    const decodeNewlinesForDisplay = (s) => {
        if (typeof s !== 'string') return s ?? '';
        return s.replace(/\\n/g, '\n');
    };

    const handleReadMore = (announcementId) => {
        const newExpanded = new Set(expandedAnnouncements);
        if (newExpanded.has(announcementId)) {
            newExpanded.delete(announcementId);
        } else {
            newExpanded.add(announcementId);
        }
        setExpandedAnnouncements(newExpanded);
    };

    // Date helpers
    const isSameDay = (d1, d2) => {
        return d1.getFullYear() === d2.getFullYear() &&
            d1.getMonth() === d2.getMonth() &&
            d1.getDate() === d2.getDate();
    };

    const isToday = (dateStr) => {
        const d = new Date(dateStr);
        return isSameDay(new Date(), d);
    };

    const isYesterday = (dateStr) => {
        const d = new Date(dateStr);
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        return isSameDay(yesterday, d);
    };

    const formatDateDisplay = (dateStr) => {
        const d = new Date(dateStr);
        if (isToday(dateStr)) {
            return `Today, ${d.toLocaleTimeString()}`;
        }
        if (isYesterday(dateStr)) {
            return `Yesterday, ${d.toLocaleTimeString()}`;
        }
        return d.toLocaleString();
    };

    if (loading) return <p style={{ textAlign: 'center' }}>Loading...</p>;
    if (error) return <p style={{ textAlign: 'center', color: 'red' }}>{error}</p>;

    return (
        <div className="announcements-list">
            {todayAnnouncements.length > 0 ? (
                todayAnnouncements.map((announcement) => {
                    const isExpanded = expandedAnnouncements.has(announcement._id);
                    const decoded = decodeNewlinesForDisplay(announcement.description);
                    const needsTruncation = shouldTruncate(decoded);
                    
                    return (
                        <div key={announcement._id} className="announcement-card" data-id={announcement._id}>
                            <div className="announcement-card-body">
                                {announcement.imageUrl && (
                                    <div style={{ marginBottom: '0.75rem' }}>
                                        <img
                                            src={announcement.imageUrl}
                                            alt={announcement.title}
                                            style={{ width: '100%', maxHeight: 420, objectFit: 'cover', borderRadius: 8 }}
                                        />
                                    </div>
                                )}
                                <h5 className="announcement-card-title">{announcement.title}</h5>
                                <p className="announcement-card-text" style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
                                    {isExpanded || !needsTruncation ? (
                                        <>
                                            {decoded}
                                            {needsTruncation && (
                                                <> {' '}
                                                    <button
                                                        className="read-more-btn"
                                                        onClick={() => handleReadMore(announcement._id)}
                                                        style={{
                                                            background: 'transparent',
                                                            border: 'none',
                                                            color: '#1a73e8',
                                                            padding: 0,
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        {isExpanded ? 'Read Less' : 'Read More'}
                                                    </button>
                                                </>
                                            )}
                                        </>
                                    ) : (
                                        <>
                                            {truncateText(decoded)}{' '}
                                            <button
                                                className="read-more-btn"
                                                onClick={() => handleReadMore(announcement._id)}
                                                style={{
                                                    background: 'transparent',
                                                    border: 'none',
                                                    color: '#1a73e8',
                                                    padding: 0,
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                {isExpanded ? 'Read Less' : 'Read More'}
                                            </button>
                                        </>
                                    )}
                                </p>
                                <small className="announcement-card-date">
                                    Posted : {formatDateDisplay(announcement.createdAt)}
                                </small>

                            </div>
                        </div>
                    );
                })
            ) : (
                <p className="no-announcements">No announcements for today.</p>
            )}
        </div>
    );
};

export default TodayAnnouncements;