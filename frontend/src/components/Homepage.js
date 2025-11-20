import React, { useEffect, useState, useCallback } from "react";
import DOMPurify from "dompurify"; // To sanitize HTML and prevent XSS attacks
import "./homepage.css"; // Importing styles for the component

const Homepage = ({ userEmail, demoMode = false, demoEmails = [] }) => {
  const backendUrl = process.env.REACT_APP_BACKEND_URL;
  // State hooks for managing various aspects of the component
  const [emails, setEmails] = useState([]); // Stores the fetched emails
  const [loading, setLoading] = useState(true); // Tracks loading state
  const [error, setError] = useState(null); // Tracks errors
  const [selectedEmail, setSelectedEmail] = useState(null); // Stores the selected email
  const [searchQuery, setSearchQuery] = useState(""); // Manages the search input value
  const [sortCriteria, setSortCriteria] = useState("date"); // Tracks sorting criteria
  const [filteredEmails, setFilteredEmails] = useState([]); // Stores filtered emails
  const [currentPage, setCurrentPage] = useState(1); // Tracks the current page for pagination
  const [emailsPerPage] = useState(10); // Defines how many emails to show per page
  const [showCompose, setShowCompose] = useState(false); // Toggles the compose email modal
  const [recipient, setRecipient] = useState(""); // Stores the recipient's email
  const [subject, setSubject] = useState(""); // Stores the subject of the email
  const [body, setBody] = useState(""); // Stores the body of the email
  const [sidebarVisible, setSidebarVisible] = useState(false); // Toggles the sidebar visibility
  // Categories used by the classifier (from real-data-pipeline)
  const CATEGORIES = [
    "important",
    "spam",
    "newsletter",
    "social",
    "promotional",
    "personal",
    "business",
    "automated",
  ];

  const capitalize = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

  // Helpers for category styling and icons
  const slugify = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const categoryIcon = (cat) => {
    const c = String(cat).toLowerCase();
    switch (c) {
      case 'important': return '❗';
      case 'spam': return '🛑';
      case 'newsletter': return '📰';
      case 'social': return '👥';
      case 'promotional': return '🏷️';
      case 'personal': return '👤';
      case 'business': return '💼';
      case 'automated': return '⚙️';
      default: return '🔖';
    }
  };

    // Return a short one-line preview text for an email (sanitized)
    const getPreview = (email) => {
      try {
        const raw = email.preview || email.snippet || email.body || "";
        // Strip HTML tags by sanitizing with no allowed tags
        const stripped = DOMPurify.sanitize(raw, { ALLOWED_TAGS: [] });
        const single = String(stripped).replace(/\s+/g, ' ').trim();
        return single.length > 120 ? `${single.slice(0, 117)}...` : single;
      } catch (e) {
        return "";
      }
    };

  const [activeCategory, setActiveCategory] = useState("all"); // Tracks the active email category (use 'all' to show everything)

  // Light/Dark Mode state
  const [isDarkMode, setIsDarkMode] = useState(false);
  const toggleDarkMode = () => setIsDarkMode((dm) => !dm);

  // Classifier service URL (can be overridden via env)
  const classifierUrl = process.env.REACT_APP_CLASSIFIER_URL || "http://localhost:5001";

  // Right-side panel state: link classification results
  const [sideItems, setSideItems] = useState([]);
  const [sideLoading, setSideLoading] = useState(false);
  const [sideError, setSideError] = useState(null);

  // Fetch emails from the server or load demo emails when demoMode is enabled
  const fetchEmails = useCallback(() => {
    if (demoMode) {
      try {
        const formatted = demoEmails.map((email) => ({
          ...email,
          classification: Array.isArray(email.classification)
            ? email.classification
            : [email.classification],
        }));
        setEmails(formatted);
        setFilteredEmails(formatted);
        setLoading(false);
      } catch (err) {
        console.error('Failed to load demo emails', err);
        setError('Failed to load demo emails.');
        setLoading(false);
      }
      return;
    }

    fetch(`${backendUrl}/auth/gmail/emails`, {
      method: "GET",
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.emails) {
          const formatted = data.emails.map((email) => ({
            ...email,
            classification: Array.isArray(email.classification)
              ? email.classification
              : [email.classification],
          }));
          setEmails(formatted);
          setFilteredEmails(formatted);
        } else {
          setError("No emails found.");
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError("Failed to load emails.");
        setLoading(false);
      });
  }, [demoMode, demoEmails]);

  useEffect(() => {
    fetchEmails();
    if (!demoMode) {
      const id = setInterval(fetchEmails, 30000);
      return () => clearInterval(id);
    }
    return undefined;
  }, [fetchEmails, demoMode]);

  // When an email is selected, call classifier's /classify_links with the email body
  useEffect(() => {
    if (!selectedEmail) {
      setSideItems([]);
      setSideError(null);
      setSideLoading(false);
      return undefined;
    }

    let isSubscribed = true;
    const controller = new AbortController();

    const fetchLinks = async () => {
      setSideLoading(true);
      setSideError(null);
      try {
        const res = await fetch(`${classifierUrl}/classify_links`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ html: selectedEmail.body }),
          signal: controller.signal,
        });
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || `Status ${res.status}`);
        }
        const data = await res.json();
        if (isSubscribed) {
          setSideItems(Array.isArray(data.results) ? data.results : []);
        }
      } catch (err) {
        if (isSubscribed) {
          if (err.name === 'AbortError') return;
          console.error('Error fetching link classifications:', err);
          setSideError(err.message || 'Failed to fetch link classifications');
          setSideItems([]);
        }
      } finally {
        if (isSubscribed) setSideLoading(false);
      }
    };

    fetchLinks();

    return () => {
      isSubscribed = false;
      controller.abort();
    };
  }, [selectedEmail, classifierUrl]);

  // Merge sort algorithm for sorting emails
  const mergeSort = useCallback((arr, sortBy) => {
    if (arr.length <= 1) return arr;
    const mid = Math.floor(arr.length / 2);
    const left = mergeSort(arr.slice(0, mid), sortBy);
    const right = mergeSort(arr.slice(mid), sortBy);
    const merge = (l, r) => {
      let res = [],
        i = 0,
        j = 0;
      while (i < l.length && j < r.length) {
        let takeLeft;
        if (sortBy === "sender") {
          takeLeft = l[i].sender.localeCompare(r[j].sender) < 0;
        } else if (sortBy === "subject") {
          takeLeft = l[i].subject.localeCompare(r[j].subject) < 0;
        } else {
          takeLeft = new Date(l[i].date) > new Date(r[j].date);
        }
        if (takeLeft) {
          res.push(l[i++]);
        } else {
          res.push(r[j++]);
        }
      }
      return res.concat(l.slice(i)).concat(r.slice(j));
    };
    return merge(left, right);
  }, []);

  // Filter & sort whenever inputs change
  useEffect(() => {
    let updated = emails.filter(
      (e) =>
        e.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.sender.toLowerCase().includes(searchQuery.toLowerCase())
    );
    updated = mergeSort(updated, sortCriteria);
    if (activeCategory !== "all") {
      updated = updated.filter((e) => {
        const cls = Array.isArray(e.classification) ? e.classification : [e.classification];
        return cls.some((c) => String(c).toLowerCase() === String(activeCategory).toLowerCase());
      });
    }
    setFilteredEmails(updated);
  }, [searchQuery, sortCriteria, emails, activeCategory, mergeSort]);

  // Pagination logic
  const indexLast = currentPage * emailsPerPage;
  const indexFirst = indexLast - emailsPerPage;
  const currentEmails = filteredEmails.slice(indexFirst, indexLast);
  const paginate = (num) => setCurrentPage(num);

  // Compose modal handlers
  const handleComposeToggle = (mode = "new", email = null) => {
    if (mode === "new") {
      setRecipient("");
      setSubject("");
      setBody("");
    } else if (email) {
      setRecipient(email.sender);
      setSubject(`Re: ${email.subject}`);
      setBody("");
    }
    setShowCompose(true);
  };

  // Send email
  const handleSendEmail = async () => {
    try {
  const res = await fetch(`${backendUrl}/auth/gmail/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ to: recipient, subject, body }),
      });
      const result = await res.json();
      if (result.success) {
        alert("Email Sent!");
        setShowCompose(false);
        fetchEmails();
      } else {
        alert("Failed to send email");
      }
    } catch (err) {
      console.error(err);
      alert("An error occurred while sending the email.");
    }
  };

  const formatDateTime = (d) =>
    new Date(d).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const handleLogout = async () => {
    try {
  await fetch(`${backendUrl}/api/logout`, {
        method: "POST",
        credentials: "include",
      });
      window.location.href = "/"; // Redirect to login page
    } catch (err) {
      console.error("Logout failed:", err);
      alert("Failed to log out. Please try again.");
    }
  };

  if (loading) return <p>Loading emails...</p>;
  if (error) return <p>{error}</p>;

  return (
    <div className={`homepage-container ${isDarkMode ? "dark-mode" : ""}`}>
      {demoMode && (
        <div style={{ position: 'fixed', top: 12, right: 12, zIndex: 50 }}>
          <div style={{ background: '#d9534f', color: 'white', padding: '6px 10px', borderRadius: 6, fontWeight: 600, fontSize: '12px' }}>Demo Mode — sample data</div>
        </div>
      )}
      {/* Sidebar */}
      <div className={`sidebar ${sidebarVisible ? "visible" : ""}`}>
        <ul>
          {(["all", ...CATEGORIES]).map((catKey) => (
            <li key={catKey}>
              <a
                onClick={() => {
                  setActiveCategory(catKey);
                  setCurrentPage(1);
                }}
                className={activeCategory === catKey ? 'active' : ''}
              >
                {catKey === 'all' ? 'All' : capitalize(catKey)}
              </a>
            </li>
          ))}
          <li>
            <a onClick={() => handleComposeToggle("new")}>Compose</a>
          </li>
          <li>
            <a onClick={handleLogout}>Logout</a>
          </li>
        </ul>
      </div>

      {/* Main Content */}
      <div className="main-content">
        <header>
          <div className="top-left">
            <button
              className="hamburger-icon"
              onClick={() => setSidebarVisible((v) => !v)}
              aria-label="Toggle sidebar"
            >
              &#9776;
            </button>
            <h1 className="top-bar-title">ImfrisivMail</h1>
            <img
              src="/assets/images/imfrisiv.png"
              alt="Logo"
              className="top-bar-logo"
            />

            <span className="header-divider" aria-hidden="true" />

            <div className="top-controls">
              <div className="search-bar">
                {/* Sort Dropdown */}
                <select
                  className="sort-dropdown"
                  value={sortCriteria}
                  onChange={(e) => setSortCriteria(e.target.value)}
                >
                  <option value="date">Sort by Date</option>
                  <option value="sender">Sort by Sender</option>
                  <option value="subject">Sort by Subject</option>
                </select>
                
                {/* Search Bar */}
                <input
                  className="search-input"
                  type="text"
                  placeholder="🔍 Search emails…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />

                {/* Dark Mode/Light Mode Switch/Toggle */}
                {/* Theme toggle moved to header right — kept empty here for spacing */}
              </div>
            </div>
          </div>
          {/* Theme toggle button on the far right of the header */}
          <div className="top-right">
            <button
              className="theme-toggle-button"
              onClick={toggleDarkMode}
              aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
              title={isDarkMode ? "Dark Mode" : "Light Mode"}
            >
              <span className="theme-icon" aria-hidden>{isDarkMode ? '🌙' : '☀️'}</span>
            </button>
          </div>
        </header>

        {!selectedEmail ? (
          <>
            {/* search controls moved to top header */}

            {/* Email List */}
            <div className="email-list-container">
              {currentEmails.map((email, idx) => (
                <div
                  key={idx}
                  className="email-item"
                  onClick={() => setSelectedEmail(email)}
                >
                  <div className="email-row">
                    <div className="email-from"><span className="email-from-value">{email.sender}</span></div>
                    <div className="email-subject">{email.subject}</div>

                    <div className="email-labels-inline">
                      {Array.isArray(email.classification)
                        ? email.classification.map((c, i) => (
                            <span key={i} className={`label-chip ${slugify(c)}`}>
                              <span className="label-icon" aria-hidden>{categoryIcon(c)}</span>
                              <span className="label-text">{capitalize(String(c).toLowerCase())}</span>
                            </span>
                          ))
                        : (
                          <span className={`label-chip ${slugify(email.classification)}`}>
                            <span className="label-icon" aria-hidden>{categoryIcon(email.classification)}</span>
                            <span className="label-text">{capitalize(String(email.classification))}</span>
                          </span>
                        )
                      }
                    </div>

                    <div className="email-date">{formatDateTime(email.date)}</div>
                  </div>
                  <div className="email-preview">{getPreview(email)}</div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className="pagination">
              {Array.from(
                { length: Math.ceil(filteredEmails.length / emailsPerPage) },
                (_, i) => (
                  <button
                    key={i}
                    onClick={() => paginate(i + 1)}
                    className={currentPage === i + 1 ? "active-page" : ""}
                  >
                    {i + 1}
                  </button>
                )
              )}
            </div>
          </>
        ) : (
          /* Email Detail View - two column layout (main + right panel) */
          <div className="email-detail-layout">
            <div className="email-detail-container email-detail-main">
              <button
                className="back-button"
                onClick={() => setSelectedEmail(null)}
              >
                Back
              </button>
              <h2>Sender: {selectedEmail.sender}</h2>
              <h3>Subject: {selectedEmail.subject}</h3>
              <p>
                Classification: {Array.isArray(selectedEmail.classification) ? selectedEmail.classification.map(c => capitalize(String(c).toLowerCase())).join(', ') : capitalize(String(selectedEmail.classification))}
              </p>
              <p className="date-time">
                Date: {formatDateTime(selectedEmail.date)}
              </p>
              <div
                className="email-body"
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(selectedEmail.body),
                }}
              />
              <button
                className="reply-button"
                onClick={() => handleComposeToggle("reply", selectedEmail)}
              >
                Reply
              </button>
            </div>

            {/* Right-side panel: placeholder list (20% width) */}
            <aside className="email-detail-side">
              <h4>Link Classifications</h4>
              {sideLoading ? (
                <p>Scanning links...</p>
              ) : sideError ? (
                <p style={{ color: 'var(--muted)' }}>Error: {sideError}</p>
              ) : sideItems.length === 0 ? (
                <p style={{ color: 'var(--muted)' }}>No links found.</p>
              ) : (
                <ul className="side-list">
                  {sideItems.map((it, i) => (
                    <li key={i} className="side-list-item">
                      <div style={{ fontSize: 13, color: 'var(--text)', marginBottom: 4 }}>{it.url}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)' }}>Prediction: {String(it.prediction)}</div>
                    </li>
                  ))}
                </ul>
              )}
            </aside>
          </div>
        )}

        {/* Compose Modal */}
        {showCompose && (
          <div className="compose-modal">
            <div className="compose-form">
              <div className="compose-header">
                <button
                  className="close-button"
                  onClick={() => setShowCompose(false)}
                >
                  ✕
                </button>
              </div>
              <input type="text" placeholder="From" value={userEmail} disabled />
              <input
                type="text"
                placeholder="Recipient's email"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
              />
              <input
                type="text"
                placeholder="Subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
              <textarea
                placeholder="Write your email here..."
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
              <button onClick={handleSendEmail}>Send</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Homepage;
