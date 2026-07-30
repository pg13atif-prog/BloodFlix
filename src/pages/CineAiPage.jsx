import React from 'react';
import './CineAiPage.css';

const AI_TOOLS = [
  {
    id: 'what-to-watch',
    title: 'What Should I Watch?',
    description: 'Type any natural language prompt and get 5 tailored recommendations. (e.g. "I want a psychological thriller under two hours").',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
  },
  {
    id: 'planner',
    title: 'Movie Night Planner',
    description: 'Answer a few quick questions to find the one perfect movie for tonight. Zero scrolling, zero decision fatigue.',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
  },
  {
    id: 'pick-for-me',
    title: 'Pick For Me',
    description: 'The fastest way to pick a movie. Press one button, get one recommendation instantly.',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
  },
  {
    id: 'debate',
    title: 'Movie Debate',
    description: 'Can\'t decide between two movies? Let our AI compare them across 9 categories and declare a winner.',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line></svg>
  }
];

const CineAiPage = () => {
  return (
    <div className="cineai-hub page-container">
      <div className="cineai-hub-header">
        <h1>CineAI <span>Your Personal Movie Expert</span></h1>
        <p>Eliminate decision fatigue with our suite of intelligent movie recommendation tools.</p>
      </div>

      <div className="cineai-tools-grid">
        {AI_TOOLS.map(tool => (
          <a key={tool.id} href={`#cineai/${tool.id}`} className="cineai-card">
            <div className="cineai-card-icon">{tool.icon}</div>
            <h2>{tool.title}</h2>
            <p>{tool.description}</p>
            <div className="cineai-card-footer">
              <span>Launch Tool</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
};

export default CineAiPage;
