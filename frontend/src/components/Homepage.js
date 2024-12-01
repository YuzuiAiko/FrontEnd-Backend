import React, { useEffect, useState } from "react";
import DOMPurify from "dompurify";
import "./homepage.css";

const Homepage = () => {
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortCriteria, setSortCriteria] = useState("date");
  const [filteredEmails, setFilteredEmails] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [emailsPerPage] = useState(10);
  const [showCompose, setShowCompose] = useState(false);
  const [recipient, setRecipient] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [activeCategory, setActiveCategory] = useState("Inbox");

  useEffect(() => {
    fetch("https://localhost:5000/auth/gmail/emails", {
      method: "GET",
      credentials: "include",
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.emails) {
          const formattedEmails = data.emails.map(email => ({
            ...email,
            classification: Array.isArray(email.classification) ? email.classification : [email.classification]
          }));
          setEmails(formattedEmails);
          setFilteredEmails(formattedEmails);
          console.log("Fetched emails with classifications:", formattedEmails);
        } else {
          setError("No emails found.");
        }
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching emails:", error);
        setError("Failed to load emails.");
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    const updatedEmails = emails.filter(
      (email) =>
        email.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        email.sender.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (sortCriteria === "sender") {
      updatedEmails.sort((a, b) => a.sender.localeCompare(b.sender));
    } else if (sortCriteria === "subject") {
      updatedEmails.sort((a, b) => a.subject.localeCompare(b.subject));
    } else {
      updatedEmails.sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    // Filter emails based on active category
    if (activeCategory !== "Inbox") {
      setFilteredEmails(
        updatedEmails.filter((email) => email.classification.includes(activeCategory))
      );
    } else {
      setFilteredEmails(updatedEmails);
    }
  }, [searchQuery, sortCriteria, emails, activeCategory]);

  const handleCategoryChange = (category) => {
    setActiveCategory(category);
    setCurrentPage(1);
  };

  if (loading) {
    return <p>Loading emails...</p>;
  }

  if (error) {
    return <p>{error}</p>;
  }

  const indexOfLastEmail = currentPage * emailsPerPage;
  const indexOfFirstEmail = indexOfLastEmail - emailsPerPage;
  const currentEmails = filteredEmails.slice(indexOfFirstEmail, indexOfLastEmail);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const handleComposeToggle = (mode = "new", email = null) => {
    if (mode === "new") {
      setRecipient("");
      setSubject("");
      setBody("");
    } else if (mode === "reply" && email) {
      setRecipient(email.sender);
      setSubject(`Re: ${email.subject}`);
      setBody(""); // Clear the body for a reply
    }
    setShowCompose(true);
  };

  const handleSendEmail = async () => {
    try {
      const response = await fetch("https://localhost:5000/auth/gmail/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: recipient,
          subject: subject,
          body: body,
        }),
        credentials: "include",
      });

      const data = await response.json();

      if (data.success) {
        alert("Email Sent!");
        setRecipient("");
        setSubject("");
        setBody("");
        setShowCompose(false);
      } else {
        alert("Failed to send email");
      }
    } catch (error) {
      console.error("Error sending email:", error);
      alert("An error occurred while sending the email.");
    }
  };

  return (
    <div className="homepage-container">
      <div className={`sidebar ${sidebarVisible ? "visible" : ""}`}>
        <ul>
          <li>
            <a href="#inbox" onClick={() => handleCategoryChange("Inbox")}>Inbox</a>
          </li>
          <li>
            <a href="#important" onClick={() => handleCategoryChange("Important")}>Important</a>
          </li>
          <li>
            <a href="#promotions" onClick={() => handleCategoryChange("Promotions")}>Promotions</a>
          </li>
          <li>
            <a href="#spam" onClick={() => handleCategoryChange("Spam")}>Spam</a>
          </li>
          <li>
            <a href="#compose" onClick={() => handleComposeToggle("new")}>Compose</a>
          </li>
        </ul>
      </div>

      <div className="main-content">
        <button className="hamburger-icon" onClick={() => setSidebarVisible(!sidebarVisible)}>
          &#9776;
        </button>

        {!selectedEmail ? (
          <>
            <header>
              <div className="search-bar">
                <input
                  type="text"
                  placeholder="Search emails..."
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
                </select>
              </div>
            </header>

            <div className="email-list-container">
              {currentEmails.map((email, index) => (
                <div
                  key={index}
                  className="email-item"
                  onClick={() => setSelectedEmail(email)}
                >
                  <h3>{email.subject}</h3>
                  <p>From: {email.sender}</p>
                  <p>Classification: {email.classification.join(", ")}</p>  {/* Display Classification */}
                </div>
              ))}
            </div>

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
          <div className="email-detail-container">
            <button className="back-button" onClick={() => setSelectedEmail(null)}>
              Back
            </button>
            <h2>Sender: {selectedEmail.sender}</h2>
            <h3>Subject: {selectedEmail.subject}</h3>
            <p>Classification: {selectedEmail.classification.join(", ")}</p>  {/* Display Classification */}
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
              ></textarea>
              <button onClick={handleSendEmail}>Send</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Homepage;
