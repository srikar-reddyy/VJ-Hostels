import { useState, useEffect } from 'react';
import { Megaphone, CalendarDays, ArrowRight, CheckCircle } from 'lucide-react';
import Outpass from './Outpass';
import OutpassList from './OutpassList';
import CurrentPasses from './CurrentPasses';
import FormsAnimation from '../../assets/forms-animate.svg';

const OutpassPage = () => {
    const [activeTab, setActiveTab] = useState('outpass');
    const [showAnimation, setShowAnimation] = useState(true);
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => setShowAnimation(false), 2500);
        return () => clearTimeout(timer);
    }, []);

    const fadeInStyle = {
        animation: 'fadeIn 0.8s ease-in-out',
    };

    const keyframes = `
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideIn {
            from { transform: translateX(-5px); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
    `;

    const tabs = [
        { id: 'outpass', label: 'Apply', icon: CalendarDays },
        { id: 'currentPasses', label: 'Current', icon: CheckCircle },
        { id: 'outpassList', label: 'History', icon: ArrowRight }
    ];

    return (
        <div className="outpass-container" style={{ textAlign: 'center', padding: '1rem' }}>
            <style>{keyframes}</style>

            {showAnimation ? (
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '70vh',
                        textAlign: 'center',
                        ...fadeInStyle,
                    }}
                >
                    <div style={{
                        width: '180px',
                        maxWidth: '80%',
                        height: 'auto',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}>
                        <img
                            src={FormsAnimation}
                            alt="Forms animation"
                            style={{
                                width: '100%',
                                height: 'auto',
                                display: 'block',
                                objectFit: 'contain',
                            }}
                        />
                    </div>
                    <p
                        style={{
                            marginTop: '1.5rem',
                            color: '#6c757d',
                            fontSize: '1rem',
                            fontWeight: '500',
                        }}
                    >
                        Preparing Outpass Section...
                    </p>

                    <style>
                        {`
                            @media (max-width: 480px) {
                                .outpass-container > div > div:first-child {
                                    width: 140px !important;
                                }
                            }
                        `}
                    </style>
                </div>
            ) : (
                <div style={fadeInStyle}>
                    {/* Desktop Header */}
                    {!isMobile && (
                        <div className="outpass-header" style={{ marginBottom: '1rem' }}>
                            <h2
                                className="outpass-title"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.5rem',
                                    fontSize: '1.5rem',
                                    fontWeight: '600',
                                }}
                            >
                                <Megaphone size={32} />
                                <span>OUTPASS SECTION</span>
                            </h2>
                        </div>
                    )}

                    {/* Tabs Navigation */}
                    <div
                        className="outpass-tabs"
                        style={{
                            display: 'flex',
                            justifyContent: 'center',
                            gap: isMobile ? '0.5rem' : '1rem',
                            marginBottom: '1.5rem',
                            flexWrap: 'wrap',
                            padding: isMobile ? '0 0.5rem' : '0',
                        }}
                    >
                        {isMobile ? (
                            // Modern Mobile Segmented Control
                            <div style={{
                                display: 'flex',
                                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                                borderRadius: '16px',
                                padding: '4px',
                                gap: '4px',
                                width: '100%',
                                maxWidth: '400px',
                                border: '1px solid rgba(102, 126, 234, 0.2)',
                            }}>
                                {tabs.map((tab) => {
                                    const Icon = tab.icon;
                                    const isActive = activeTab === tab.id;
                                    return (
                                        <div
                                            key={tab.id}
                                            onClick={() => setActiveTab(tab.id)}
                                            style={{
                                                flex: 1,
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '0.25rem',
                                                padding: '0.75rem 0.5rem',
                                                borderRadius: '12px',
                                                cursor: 'pointer',
                                                backgroundColor: isActive ? '#667eea' : 'transparent',
                                                color: isActive ? '#fff' : '#667eea',
                                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                                boxShadow: isActive ? '0 4px 12px rgba(102, 126, 234, 0.3)' : 'none',
                                                transform: isActive ? 'translateY(-1px)' : 'none',
                                            }}
                                        >
                                            <Icon size={20} strokeWidth={2.5} />
                                            <span style={{
                                                fontSize: '0.7rem',
                                                fontWeight: isActive ? '700' : '600',
                                                letterSpacing: '0.02em',
                                            }}>
                                                {tab.label}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            // Desktop Tabs
                            <>
                                <div
                                    className={`outpass-tab ${activeTab === 'outpass' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('outpass')}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        cursor: 'pointer',
                                        padding: '0.6rem 1rem',
                                        borderRadius: '8px',
                                        backgroundColor:
                                            activeTab === 'outpass' ? '#007bff' : '#f0f0f0',
                                        color: activeTab === 'outpass' ? '#fff' : '#333',
                                        transition: 'all 0.3s ease',
                                    }}
                                >
                                    <CalendarDays size={20} />
                                    <span>Apply For OutPass</span>
                                </div>

                                <div
                                    className={`outpass-tab ${activeTab === 'currentPasses' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('currentPasses')}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        cursor: 'pointer',
                                        padding: '0.6rem 1rem',
                                        borderRadius: '8px',
                                        backgroundColor:
                                            activeTab === 'currentPasses' ? '#007bff' : '#f0f0f0',
                                        color: activeTab === 'currentPasses' ? '#fff' : '#333',
                                        transition: 'all 0.3s ease',
                                    }}
                                >
                                    <CheckCircle size={20} />
                                    <span>Current Passes</span>
                                </div>

                                <div
                                    className={`outpass-tab ${activeTab === 'outpassList' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('outpassList')}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        cursor: 'pointer',
                                        padding: '0.6rem 1rem',
                                        borderRadius: '8px',
                                        backgroundColor:
                                            activeTab === 'outpassList' ? '#007bff' : '#f0f0f0',
                                        color: activeTab === 'outpassList' ? '#fff' : '#333',
                                        transition: 'all 0.3s ease',
                                    }}
                                >
                                    <ArrowRight size={20} />
                                    <span>OutPass History</span>
                                </div>
                            </>
                        )}
                    </div>

                    <div className="outpass-content" style={{ ...fadeInStyle }}>
                        {activeTab === 'outpass' && <Outpass />}
                        {activeTab === 'currentPasses' && <CurrentPasses />}
                        {activeTab === 'outpassList' && <OutpassList />}
                    </div>
                </div>
            )}
        </div>
    );
};

export default OutpassPage;