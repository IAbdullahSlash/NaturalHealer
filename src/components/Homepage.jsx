import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { diseases } from '../data/diseases';
import { beds, bedFor, ingredientsFor } from '../data/kitchen';
import { useFavorites } from '../hooks/useFavorites';
import Navbar from './Navbar';
import SearchBar from './SearchBar';
import { HerbRail } from './Herbs';
import Vaidya from './Vaidya';
import { HerbMark } from './Botanicals';
import { Mandala } from './Garden';
import ConditionLedger from './ConditionLedger';
import DiseaseModal from './DiseaseModal';
import Icon from './Icon';
import '../styles/Homepage.css';

function greeting() {
  const hour = new Date().getHours();
  if (hour < 5) return 'Still up';
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

const counts = Object.fromEntries(
  beds.map(b => [b.id, b.id === 'all' ? diseases.length : diseases.filter(d => d.category === b.id).length])
);

const Homepage = ({ user, onLogout, onOpenAIChat }) => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDisease, setSelectedDisease] = useState(null);
  const { favorites, toggleFavorite, isFavorite } = useFavorites(user);
  const [prakriti, setPrakriti] = useState(undefined);

  useEffect(() => {
    api('/profile')
      .then(({ profile }) => setPrakriti(profile.prakriti || null))
      .catch(() => setPrakriti(null));
  }, [user?.uid]);

  const filteredDiseases = useMemo(() => {
    let filtered = diseases;

    if (selectedCategory === 'saved') {
      filtered = filtered.filter(disease => favorites.includes(disease.id));
    } else if (selectedCategory !== 'all') {
      filtered = filtered.filter(disease => disease.category === selectedCategory);
    }

    const query = searchQuery.trim().toLowerCase();
    if (query) {
      filtered = filtered.filter(disease =>
        disease.title.toLowerCase().includes(query) ||
        disease.desc.toLowerCase().includes(query) ||
        disease.remedies.some(remedy => remedy.toLowerCase().includes(query)) ||
        ingredientsFor(disease).some(i => i.name.toLowerCase().includes(query) || i.hindi.includes(searchQuery.trim()))
      );
    }

    return filtered;
  }, [selectedCategory, searchQuery, favorites]);

  const firstName = user?.displayName && user.displayName !== 'User'
    ? user.displayName.split(' ')[0]
    : null;

  const sectionTitle = selectedCategory === 'all'
    ? 'All conditions'
    : selectedCategory === 'saved'
      ? 'Saved remedies'
      : bedFor(selectedCategory).label;

  const keeper = selectedCategory === 'saved' ? null : bedFor(selectedCategory);

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
  };

  const isSavedEmpty = selectedCategory === 'saved' && favorites.length === 0 && !searchQuery;

  return (
    <div className="dashboard">
      <Navbar user={user} onLogout={onLogout} onOpenAIChat={onOpenAIChat} />

      <main id="main-content" tabIndex={-1} className="container dashboard-main">
        <header className="dashboard-head">
          <Mandala size={420} color="#B08D57" className="dashboard-mandala" />
          <div className="dashboard-greet">
            <p className="eyebrow">{greeting()}{firstName ? `, ${firstName}` : ''}</p>
            <h1 className="t-title dashboard-title">What needs care today?</h1>
            <div className="dashboard-search">
              <SearchBar value={searchQuery} onChange={setSearchQuery} />
            </div>
            {prakriti !== undefined && (
              <Link to="/prakriti" className="prakriti-chip">
                <Icon name={prakriti ? 'pulse' : 'leaf'} size={16} />
                {prakriti ? (
                  <span>Your prakriti: <strong>{prakriti.label}</strong></span>
                ) : (
                  <span>Find your prakriti <span className="prakriti-chip-meta">· 12 questions, 2 minutes</span></span>
                )}
                <Icon name="arrowRight" size={14} />
              </Link>
            )}
          </div>
          <div className="dashboard-vanya">
            <div className="dashboard-vanya-arch" aria-hidden="true"><Vaidya size={176} /></div>
            <button type="button" className="btn btn-paper btn-sm dashboard-ask" onClick={onOpenAIChat}>
              <Icon name="sparkle" size={15} />
              Consult Vanya
            </button>
          </div>
        </header>

        <div className="dashboard-filters">
          <HerbRail
            selected={selectedCategory}
            onSelect={setSelectedCategory}
            counts={counts}
            savedCount={favorites.length}
          />
        </div>

        <div className="dashboard-results-head">
          <h2 className="t-heading">
            {keeper && <HerbMark herb={keeper.herb} size={40} key={keeper.id} />}
            {sectionTitle}
          </h2>
          <p className="t-muted" aria-live="polite">
            {searchQuery
              ? `${filteredDiseases.length} ${filteredDiseases.length === 1 ? 'match' : 'matches'} for “${searchQuery.trim()}”`
              : `${filteredDiseases.length} ${filteredDiseases.length === 1 ? 'ailment' : 'ailments'}`}
          </p>
        </div>

        {filteredDiseases.length === 0 ? (
          <div className="empty">
            <h3 className="t-heading">
              {isSavedEmpty ? 'Nothing saved yet' : 'No condition matches that'}
            </h3>
            <p>
              {isSavedEmpty
                ? 'Tap the heart on any ailment to keep its remedies here.'
                : 'Try another word, a household name like haldi or jeera, or ask the guide.'}
            </p>
            <div className="empty-actions">
              <button className="btn btn-paper" onClick={clearFilters}>
                {isSavedEmpty ? 'Show everything' : 'Clear search'}
              </button>
              {!isSavedEmpty && (
                <button className="btn btn-leaf" onClick={onOpenAIChat}>
                  <Icon name="sparkle" size={16} />
                  Ask Vanya
                </button>
              )}
            </div>
          </div>
        ) : (
          <ConditionLedger
            conditions={filteredDiseases}
            mode="open"
            onOpen={setSelectedDisease}
            isFavorite={isFavorite}
            onToggleFavorite={toggleFavorite}
          />
        )}

        <aside className="guide-strip">
          <p>
            <strong>Not sure where to start?</strong> Describe how you feel and Vanya will point you to remedies, foods and habits, answering from the <Link to="/herbs">herb knowledge base</Link> and showing which entries it used.
          </p>
          <button className="btn btn-leaf" onClick={onOpenAIChat}>
            Ask Vanya
            <Icon name="arrowRight" size={18} className="btn-arrow" />
          </button>
        </aside>
      </main>

      {selectedDisease && (
        <DiseaseModal
          disease={selectedDisease}
          onClose={() => setSelectedDisease(null)}
          isFavorite={isFavorite(selectedDisease.id)}
          onToggleFavorite={() => toggleFavorite(selectedDisease.id)}
        />
      )}
    </div>
  );
};

export default Homepage;
