import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from "react-router-dom";
import { BarChart3, TrendingUp, Users, Briefcase, GraduationCap, Globe, Home, Menu, X } from "lucide-react";

// Import your actual page components
import BarChartPage from "./pages/BarChartPage";
import LineChartPage from "./pages/LineChartPage";
import DensityPlotPage from "./pages/DensityPlotPage";
import TreemapPage from "./pages/TreemapPage";
import HorizontalChartPage from "./pages/HorizontalChartPage";
import FlowMapPage from "./pages/FlowMapPage";

// Navigation items configuration
const navigationItems = [
  { path: "/", label: "Dashboard", icon: Home },
  { path: "/bar-chart", label: "Civil Status", icon: BarChart3 },
  { path: "/line-chart", label: "Sex", icon: TrendingUp },
  { path: "/pie-chart", label: "Age", icon: Users },
  { path: "/treemap-chart", label: "Occupation", icon: Briefcase },
  { path: "/horizontal-bar-chart", label: "Education", icon: GraduationCap },
  { path: "/flow-map", label: "Major Countries", icon: Globe },
];

// Dashboard Home Component
function DashboardHome() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <h2 style={{ fontSize: '30px', fontWeight: 'bold', color: '#1f2937', margin: 0 }}>
        Welcome to Filipino Emigrants Inventory
      </h2>
      
      {/* Stats Cards */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '24px' 
      }}>
        {[
          { title: "Year Range", value: "1980s - 2020", icon: TrendingUp, color: "#8b5cf6" },
        ].map((stat, idx) => (
          <div key={idx} style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            padding: '24px',
            transition: 'box-shadow 0.3s'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ color: '#6b7280', fontSize: '14px', fontWeight: '500', margin: 0 }}>
                  {stat.title}
                </p>
                <p style={{ fontSize: '30px', fontWeight: 'bold', color: '#1f2937', marginTop: '8px', marginBottom: 0 }}>
                  {stat.value}
                </p>
              </div>
              <div style={{
                backgroundColor: stat.color,
                padding: '16px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <stat.icon style={{ width: '24px', height: '24px', color: 'white' }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Hero Section */}
      <div style={{
        background: 'linear-gradient(to right, #3b82f6, #8b5cf6)',
        borderRadius: '12px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        padding: '32px',
        color: 'white'
      }}>
        <h3 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px', marginTop: 0 }}>
          Data Visualization Suite
        </h3>
        <p style={{ color: '#dbeafe', marginBottom: '16px', lineHeight: '1.6' }}>
          Explore comprehensive insights into Filipino emigration patterns through interactive charts and analytics.
          Navigate through different visualization types using the sidebar to discover trends in demographics, education, occupation, and destination countries.
        </p>
        <button style={{
          backgroundColor: 'white',
          color: '#3b82f6',
          padding: '8px 24px',
          borderRadius: '8px',
          fontWeight: '600',
          border: 'none',
          cursor: 'pointer',
          transition: 'background-color 0.2s'
        }}>
          Get Started
        </button>
      </div>
      
      {/* Quick Info Grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '24px' 
      }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          padding: '24px'
        }}>
          <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#1f2937', marginTop: 0, marginBottom: '16px' }}>
            Key Insights
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              { color: '#3b82f6', text: 'Majority of emigrants are between 25-39 years old' },
              { color: '#10b981', text: 'College graduates represent the largest education group' },
              { color: '#8b5cf6', text: 'Professional occupations lead emigration statistics' },
            ].map((item, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  backgroundColor: item.color,
                  borderRadius: '50%',
                  marginTop: '6px',
                  flexShrink: 0
                }} />
                <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>{item.text}</p>
              </div>
            ))}
          </div>
        </div>
        
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          padding: '24px'
        }}>
          <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#1f2937', marginTop: 0, marginBottom: '16px' }}>
            Recent Updates
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ borderLeft: '4px solid #3b82f6', paddingLeft: '16px' }}>
              <p style={{ fontSize: '14px', fontWeight: '600', color: '#1f2937', margin: 0 }}>Data Refresh</p>
              <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px', marginBottom: 0 }}>
                Latest statistics from Q4 2024 now available
              </p>
            </div>
            <div style={{ borderLeft: '4px solid #10b981', paddingLeft: '16px' }}>
              <p style={{ fontSize: '14px', fontWeight: '600', color: '#1f2937', margin: 0 }}>New Features</p>
              <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px', marginBottom: 0 }}>
                Enhanced filtering and export capabilities added
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Sidebar Component
function Sidebar({ isOpen, toggleSidebar }) {
  const location = useLocation();
  
  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 20,
            display: window.innerWidth >= 1024 ? 'none' : 'block'
          }}
          onClick={toggleSidebar}
        />
      )}
      
      {/* Sidebar */}
      <aside style={{
        position: window.innerWidth >= 1024 ? 'static' : 'fixed',
        top: 0,
        bottom: 0,
        left: 0,
        zIndex: 30,
        width: '256px',
        background: 'linear-gradient(to bottom, #111827, #1f2937)',
        color: 'white',
        transform: (window.innerWidth >= 1024 || isOpen) ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.3s ease-in-out',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh'
      }}>
        {/* Logo/Header */}
        <div style={{ padding: '24px', borderBottom: '1px solid #374151' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>Emigrants</h2>
              <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px', marginBottom: 0 }}>
                Analytics Dashboard
              </p>
            </div>
            <button 
              onClick={toggleSidebar}
              style={{
                display: window.innerWidth >= 1024 ? 'none' : 'block',
                background: 'none',
                border: 'none',
                color: '#9ca3af',
                cursor: 'pointer',
                padding: 0
              }}
            >
              <X style={{ width: '24px', height: '24px' }} />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ 
          flex: 1, 
          padding: '16px', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '8px',
          overflowY: 'auto' 
        }}>
          {navigationItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => window.innerWidth < 1024 && toggleSidebar()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  transition: 'all 0.2s',
                  backgroundColor: isActive ? '#3b82f6' : 'transparent',
                  color: isActive ? 'white' : '#d1d5db'
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = '#374151';
                    e.currentTarget.style.color = 'white';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = '#d1d5db';
                  }
                }}
              >
                <item.icon style={{ 
                  width: '20px', 
                  height: '20px',
                  color: isActive ? 'white' : '#9ca3af'
                }} />
                <span style={{ fontWeight: '500' }}>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div style={{ padding: '16px', borderTop: '1px solid #374151' }}>
          <div style={{ backgroundColor: '#374151', borderRadius: '8px', padding: '16px' }}>
            <p style={{ fontSize: '12px', color: '#9ca3af', margin: 0 }}>Data Source</p>
            <p style={{ fontSize: '14px', fontWeight: '500', marginTop: '4px', marginBottom: 0 }}>
              Philippine Statistics Authority
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}

// Main App Content Component
function AppContent() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#f3f4f6', overflow: 'hidden' }}>
      <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
      
      {/* Main Content */}
      <div style={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column',
        overflow: 'hidden' 
      }}>
        
        {/* Top Header - REMOVED */}
        
        {/* Page Content */}
        <main style={{ 
          flex: 1, 
          overflowY: 'auto',
          padding: '24px'
        }}>
          {/* This button is now needed here to open the sidebar on mobile */}
          <button
            onClick={toggleSidebar}
            style={{
              display: window.innerWidth >= 1024 ? 'none' : 'block',
              background: 'none',
              border: 'none',
              color: '#4b5563',
              cursor: 'pointer',
              padding: 0,
              marginBottom: '16px' // Added some spacing
            }}
          >
            <Menu style={{ width: '24px', height: '24px' }} />
          </button>
          
          <Routes>
            <Route path="/" element={<DashboardHome />} />
            <Route path="/bar-chart" element={<BarChartPage />} />
            <Route path="/line-chart" element={<LineChartPage />} />
            <Route path="/pie-chart" element={<DensityPlotPage />} />
            <Route path="/treemap-chart" element={<TreemapPage />} />
            <Route path="/horizontal-bar-chart" element={<HorizontalChartPage />} />
            <Route path="/flow-map" element={<FlowMapPage />} />
          </Routes>
        </main>

        {/* Footer */}
        <footer style={{ 
          backgroundColor: 'white', 
          borderTop: '1px solid #e5e7eb',
          padding: '16px 24px'
        }}>
          <p style={{ 
            textAlign: 'center', 
            fontSize: '14px', 
            color: '#6b7280',
            margin: 0 
          }}>
            © {new Date().getFullYear()} Filipino Emigrants Data Visualization. All rights reserved.
          </p>
        </footer>
      </div>
    </div>
  );
}

// Main App Component
function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;