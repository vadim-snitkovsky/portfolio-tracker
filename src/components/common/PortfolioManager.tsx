import { useState } from 'react';
import { usePortfolioStore } from '../../store/portfolioStore';
import { formatDate } from '../../utils/formatters';
import './PortfolioManager.css';

interface PortfolioManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PortfolioManager: React.FC<PortfolioManagerProps> = ({ isOpen, onClose }) => {
  const [newPortfolioName, setNewPortfolioName] = useState('');
  const [saveAsName, setSaveAsName] = useState('');
  const [showNewForm, setShowNewForm] = useState(false);
  const [showSaveAsForm, setShowSaveAsForm] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const activePortfolioId = usePortfolioStore((state) => state.activePortfolioId);
  const activePortfolioName = usePortfolioStore((state) => state.activePortfolioName);
  const getSavedPortfolios = usePortfolioStore((state) => state.getSavedPortfolios);
  const loadSavedPortfolio = usePortfolioStore((state) => state.loadSavedPortfolio);
  const deleteSavedPortfolio = usePortfolioStore((state) => state.deleteSavedPortfolio);
  const renameSavedPortfolio = usePortfolioStore((state) => state.renameSavedPortfolio);
  const saveCurrentPortfolio = usePortfolioStore((state) => state.saveCurrentPortfolio);
  const createNewPortfolio = usePortfolioStore((state) => state.createNewPortfolio);

  const portfolios = getSavedPortfolios();

  const handleCreateNew = () => {
    if (!newPortfolioName.trim()) {
      setMessage({ type: 'error', text: 'Please enter a portfolio name' });
      return;
    }

    createNewPortfolio(newPortfolioName.trim());
    setMessage({ type: 'success', text: `Created new portfolio: ${newPortfolioName}` });
    setNewPortfolioName('');
    setShowNewForm(false);
  };

  const handleSaveAs = () => {
    if (!saveAsName.trim()) {
      setMessage({ type: 'error', text: 'Please enter a portfolio name' });
      return;
    }

    saveCurrentPortfolio(saveAsName.trim());
    setMessage({ type: 'success', text: `Saved portfolio as: ${saveAsName}` });
    setSaveAsName('');
    setShowSaveAsForm(false);
  };

  const handleSaveCurrent = () => {
    const name = activePortfolioName || 'My Portfolio';
    saveCurrentPortfolio(name);
    setMessage({ type: 'success', text: `Saved portfolio: ${name}` });
  };

  const handleLoad = (id: string, name: string) => {
    const success = loadSavedPortfolio(id);
    if (success) {
      setMessage({ type: 'success', text: `Loaded portfolio: ${name}` });
    } else {
      setMessage({ type: 'error', text: `Failed to load portfolio: ${name}` });
    }
  };

  const handleDelete = (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"? This cannot be undone.`)) {
      return;
    }

    const success = deleteSavedPortfolio(id);
    if (success) {
      setMessage({ type: 'success', text: `Deleted portfolio: ${name}` });
    } else {
      setMessage({ type: 'error', text: `Failed to delete portfolio: ${name}` });
    }
  };

  const handleStartRename = (id: string, currentName: string) => {
    setRenamingId(id);
    setRenameValue(currentName);
  };

  const handleCancelRename = () => {
    setRenamingId(null);
    setRenameValue('');
  };

  const handleRename = (id: string) => {
    if (!renameValue.trim()) {
      setMessage({ type: 'error', text: 'Please enter a portfolio name' });
      return;
    }

    const success = renameSavedPortfolio(id, renameValue.trim());
    if (success) {
      setMessage({ type: 'success', text: `Renamed portfolio to: ${renameValue}` });
      setRenamingId(null);
      setRenameValue('');
    } else {
      setMessage({ type: 'error', text: 'Failed to rename portfolio' });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="portfolio-manager-overlay" onClick={onClose}>
      <div className="portfolio-manager" onClick={(e) => e.stopPropagation()}>
        <header className="portfolio-manager__header">
          <h2>Portfolio Manager</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </header>

        {message && (
          <div className={`portfolio-manager__message portfolio-manager__message--${message.type}`}>
            {message.text}
          </div>
        )}

        <div className="portfolio-manager__content">
          {/* Current Portfolio Section */}
          <section className="portfolio-manager__section">
            <h3>Current Portfolio</h3>
            <div className="current-portfolio">
              <div className="current-portfolio__info">
                <strong>{activePortfolioName || 'Unsaved Portfolio'}</strong>
                {activePortfolioId && <span className="portfolio-id">ID: {activePortfolioId}</span>}
              </div>
              <div className="current-portfolio__actions">
                <button 
                  className="btn btn--primary"
                  onClick={handleSaveCurrent}
                >
                  Save
                </button>
                <button 
                  className="btn btn--secondary"
                  onClick={() => setShowSaveAsForm(!showSaveAsForm)}
                >
                  Save As...
                </button>
              </div>
            </div>

            {showSaveAsForm && (
              <div className="portfolio-form">
                <input
                  type="text"
                  placeholder="Enter portfolio name"
                  value={saveAsName}
                  onChange={(e) => setSaveAsName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveAs()}
                />
                <button className="btn btn--primary" onClick={handleSaveAs}>
                  Save
                </button>
                <button className="btn btn--secondary" onClick={() => setShowSaveAsForm(false)}>
                  Cancel
                </button>
              </div>
            )}
          </section>

          {/* Saved Portfolios Section */}
          <section className="portfolio-manager__section">
            <div className="section-header">
              <h3>Saved Portfolios ({portfolios.length})</h3>
              <button 
                className="btn btn--primary btn--small"
                onClick={() => setShowNewForm(!showNewForm)}
              >
                + New Portfolio
              </button>
            </div>

            {showNewForm && (
              <div className="portfolio-form">
                <input
                  type="text"
                  placeholder="Enter portfolio name"
                  value={newPortfolioName}
                  onChange={(e) => setNewPortfolioName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateNew()}
                />
                <button className="btn btn--primary" onClick={handleCreateNew}>
                  Create
                </button>
                <button className="btn btn--secondary" onClick={() => setShowNewForm(false)}>
                  Cancel
                </button>
              </div>
            )}

            {portfolios.length === 0 ? (
              <p className="empty-state">No saved portfolios yet. Create one to get started!</p>
            ) : (
              <div className="portfolio-list">
                {portfolios.map((portfolio) => {
                  const isRenaming = renamingId === portfolio.id;

                  return (
                    <div
                      key={portfolio.id}
                      className={`portfolio-item ${portfolio.id === activePortfolioId ? 'portfolio-item--active' : ''}`}
                    >
                      {isRenaming ? (
                        <div className="portfolio-form" style={{ margin: 0, padding: 0, background: 'transparent', border: 'none' }}>
                          <input
                            type="text"
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleRename(portfolio.id);
                              if (e.key === 'Escape') handleCancelRename();
                            }}
                            autoFocus
                          />
                          <button className="btn btn--small btn--primary" onClick={() => handleRename(portfolio.id)}>
                            Save
                          </button>
                          <button className="btn btn--small btn--secondary" onClick={handleCancelRename}>
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="portfolio-item__info">
                            <strong>{portfolio.name}</strong>
                            <div className="portfolio-item__meta">
                              <span>Created: {formatDate(portfolio.createdAt)}</span>
                              <span>Updated: {formatDate(portfolio.updatedAt)}</span>
                            </div>
                          </div>
                          <div className="portfolio-item__actions">
                            {portfolio.id !== activePortfolioId && (
                              <button
                                className="btn btn--small btn--primary"
                                onClick={() => handleLoad(portfolio.id, portfolio.name)}
                              >
                                Load
                              </button>
                            )}
                            <button
                              className="btn btn--small btn--secondary"
                              onClick={() => handleStartRename(portfolio.id, portfolio.name)}
                            >
                              Rename
                            </button>
                            <button
                              className="btn btn--small btn--danger"
                              onClick={() => handleDelete(portfolio.id, portfolio.name)}
                            >
                              Delete
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

