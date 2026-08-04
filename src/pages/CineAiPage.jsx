import React from 'react';
import './CineAiPage.css';

const AI_TOOLS = [
  {
    id: 'what-to-watch',
    badge: 'Natural Language AI',
    title: 'What Should I Watch?',
    description: 'Describe your exact mood, genre blend, or vibe in plain English and get 5 hyper-tailored recommendations.',
    example: 'e.g. "A mind-bending sci-fi thriller with a plot twist, under 2 hours"',
    accentColor: '#e50914',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        <circle cx="9" cy="9" r="1"></circle>
        <circle cx="12" cy="9" r="1"></circle>
        <circle cx="15" cy="9" r="1"></circle>
      </svg>
    )
  },
  {
    id: 'planner',
    badge: 'Guided Night Planner',
    title: 'Movie Night Planner',
    description: 'Answer 3 quick preferences about mood, pace, and runtime to find the single perfect movie for your night.',
    example: 'Zero decision fatigue • Instant consensus',
    accentColor: '#8b5cf6',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
        <line x1="16" y1="2" x2="16" y2="6"></line>
        <line x1="8" y1="2" x2="8" y2="6"></line>
        <line x1="3" y1="10" x2="21" y2="10"></line>
      </svg>
    )
  },
  {
    id: 'pick-for-me',
    badge: '1-Click Instant Pick',
    title: 'Pick For Me',
    description: 'The ultimate decision cure. One click fetches one high-confidence movie recommendation with zero hassle.',
    example: 'Curated top-rated gems & hidden masterpieces',
    accentColor: '#ec4899',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polygon points="5 3 19 12 5 21 5 3"></polygon>
      </svg>
    )
  },
  {
    id: 'debate',
    badge: 'AI Battle Arena',
    title: 'Movie Debate',
    description: 'Torn between two movies? Let our AI pit them head-to-head across 9 key criteria and declare a clear winner.',
    example: 'Plot, Acting, Pacing, Rewatchability & more',
    accentColor: '#f59e0b',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
        <line x1="16" y1="13" x2="8" y2="13"></line>
        <line x1="16" y1="17" x2="8" y2="17"></line>
      </svg>
    )
  }
];

const CineAiPage = () => {
  return (
    <div className="cineai-hub page-container">
      <div className="cineai-glow-1"></div>
      <div className="cineai-glow-2"></div>

      <div className="cineai-hub-header">
        <div className="cineai-badge">
          <span className="cineai-badge-sparkle">✨</span> INTELLIGENT DISCOVERY SUITE
        </div>
        <h1>
          Cine<span className="ai-gradient-text">AI</span> Engine
        </h1>
        <p>
          Eliminate decision paralysis with our next-generation suite of AI-powered recommendation tools.
        </p>
      </div>

      <div className="cineai-tools-grid">
        {AI_TOOLS.map(tool => (
          <a key={tool.id} href={`#cineai/${tool.id}`} className="cineai-card">
            <div className="cineai-card-top">
              <div className="cineai-card-icon-wrapper" style={{ '--accent': tool.accentColor }}>
                {tool.icon}
              </div>
              <span className="cineai-card-badge">{tool.badge}</span>
            </div>

            <div className="cineai-card-body">
              <h2>{tool.title}</h2>
              <p>{tool.description}</p>
              {tool.example && (
                <div className="cineai-card-example">
                  <span>{tool.example}</span>
                </div>
              )}
            </div>

            <div className="cineai-card-footer">
              <span className="cineai-launch-text">Launch Experience</span>
              <div className="cineai-arrow-circle">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                  <polyline points="12 5 19 12 12 19"></polyline>
                </svg>
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
};

export default CineAiPage;
