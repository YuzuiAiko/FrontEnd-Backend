import React, { useEffect, useState, useCallback } from "react";
import DOMPurify from "dompurify"; // To sanitize HTML and prevent XSS attacks
import "./homepage.css"; // Importing styles for the component

const Homepage = ({ userEmail }) => {
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
  const [activeCategory, setActiveCategory] = useState("Inbox"); // Tracks the active email category

  // Light/Dark Mode state
  const [isDarkMode, setIsDarkMode] = useState(false);
  const toggleDarkMode = () => setIsDarkMode((dm) => !dm);

  // Fetch emails from the server
  const fetchEmails = useCallback(() => {
    fetch("https://localhost:5000/auth/gmail/emails", {
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
  }, []);

  useEffect(() => {
    fetchEmails();
    const id = setInterval(fetchEmails, 30000);
    return () => clearInterval(id);
  }, [fetchEmails]);

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
        } else if (sortBy === "classification") {
          takeLeft = l[i].classification[0]?.localeCompare(r[j].classification[0] || "") < 0;
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
    if (activeCategory !== "Inbox") {
      updated = updated.filter((e) =>
        e.classification.includes(activeCategory)
      );
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
      const res = await fetch("https://localhost:5000/auth/gmail/send", {
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
      await fetch("https://localhost:5000/api/logout", {
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
      {/* Sidebar */}
      <div className={`sidebar ${sidebarVisible ? "visible" : ""}`}>
        <ul>
          {["Inbox", "Important", "Drafts", "Spam", "Phishing"].map((cat) => (
            <li key={cat}>
              <a onClick={() => { setActiveCategory(cat); setCurrentPage(1); }}>
                {cat}
              </a>
            </li>
          ))}
          <li>
            <a onClick={() => handleComposeToggle("new")}>Compose</a>
          </li>
          <li>
            <a onClick={handleLogout}>Logout</a> {/* Logout button */}
          </li>
        </ul>
      </div>

      {/* Main Content */}
      <div className="main-content">
        <header>
          <div>
            <button
              className="hamburger-icon"
              onClick={() => setSidebarVisible((v) => !v)}
            >
              &#9776;
            </button>
            <img 
              src="/assets/images/imfrisiv.png" 
              alt="Logo" 
              className="top-bar-logo" 
            />
            <h1 className="top-bar-title">ImfrisivMail</h1>
          </div>
        </header>

        {!selectedEmail ? (
          <>
            <header className="second-header-bar">
              <div className="search-bar">
                <input
                  type="text"
                  placeholder="Search emails…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <select
                  value={sortCriteria}
                  onChange={(e) => setSortCriteria(e.target.value)}
                >
                  <option value="date">Sort by Date</option>
                  <option value="sender">Sort by Sender</option>
                  <option value="subject">Sort by Subject</option>
                  <option value="classification">Sort by Classification</option>
                </select>
                {/* Light / Dark Mode Switch */}
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={isDarkMode}
                    onChange={toggleDarkMode}
                  />
                  <span className="slider" />
                </label>
              </div>
            </header>

            {/* Email List */}
            <div className="email-list-container">
              {currentEmails.map((email, idx) => (
                <div
                  key={idx}
                  className="email-item"
                  onClick={() => setSelectedEmail(email)}
                >
                  <h3>{email.subject}</h3>
                  <p>From: {email.sender}</p>
                  <p><b>Classification: {email.classification.join(", ")}</b></p>
                  <p><b>Phishing: {email.classification.join(", ")}</b></p>
                  <p className="date-time">
                    Date: {formatDateTime(email.date)}
                  </p>
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
          /* Email Detail View */
          <div className="email-detail-container">
            <button
              className="back-button"
              onClick={() => setSelectedEmail(null)}
            >
              Back
            </button>
            <h2>Sender: {selectedEmail.sender}</h2>
            <h3>Subject: {selectedEmail.subject}</h3>
            <p>Classification: {selectedEmail.classification.join(", ")}</p>
            <p>Phishing: {selectedEmail.classification.join(", ")}</p>
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
