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

  // Fetch emails from the server
  const fetchEmails = useCallback(() => {
    fetch("https://localhost:5000/auth/gmail/emails", {
      method: "GET",
      credentials: "include", // Includes credentials for authentication
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.emails) {
          const formattedEmails = data.emails.map(email => ({
            ...email,
            classification: Array.isArray(email.classification) 
              ? email.classification 
              : [email.classification], // Ensure classification is always an array
          }));
          setEmails(formattedEmails); // Update state with emails
          setFilteredEmails(formattedEmails); // Initialize filtered emails
          console.log("Fetched emails with classifications:", formattedEmails);
        } else {
          setError("No emails found."); // Handle case with no emails
        }
        setLoading(false); // Turn off loading state
      })
      .catch((error) => {
        console.error("Error fetching emails:", error);
        setError("Failed to load emails."); // Handle errors during fetch
        setLoading(false); // Turn off loading state
      });
  }, []); // Empty dependency array ensures this function doesn't change

  useEffect(() => {
    fetchEmails(); // Initial email fetch
    const intervalId = setInterval(fetchEmails, 30000); // Poll server every 30 seconds

    return () => clearInterval(intervalId); // Cleanup interval on component unmount
  }, [fetchEmails]); // Dependency ensures it reruns only if fetchEmails changes

  // Merge sort algorithm for sorting emails
  const mergeSort = useCallback((array, sortBy) => {
    if (array.length <= 1) return array; // Base case for recursion

    const middle = Math.floor(array.length / 2);
    const left = mergeSort(array.slice(0, middle), sortBy); // Sort left half
    const right = mergeSort(array.slice(middle), sortBy); // Sort right half

    return merge(left, right, sortBy); // Merge sorted halves
  }, []); // Empty dependency ensures stable reference

  // Helper function to merge two sorted arrays
  const merge = (left, right, sortBy) => {
    let resultArray = [];
    let leftIndex = 0;
    let rightIndex = 0;

    while (leftIndex < left.length && rightIndex < right.length) {
      if (sortBy === "sender") {
        if (left[leftIndex].sender.localeCompare(right[rightIndex].sender) < 0) {
          resultArray.push(left[leftIndex]); // Push from left array
          leftIndex++;
        } else {
          resultArray.push(right[rightIndex]); // Push from right array
          rightIndex++;
        }
      } else if (sortBy === "subject") {
        if (left[leftIndex].subject.localeCompare(right[rightIndex].subject) < 0) {
          resultArray.push(left[leftIndex]); // Push from left array
          leftIndex++;
        } else {
          resultArray.push(right[rightIndex]); // Push from right array
          rightIndex++;
        }
      } else {
        if (new Date(left[leftIndex].date) > new Date(right[rightIndex].date)) { // Sort by date
          resultArray.push(left[leftIndex]);
          leftIndex++;
        } else {
          resultArray.push(right[rightIndex]);
          rightIndex++;
        }
      }
    }

    return resultArray
      .concat(left.slice(leftIndex)) // Append remaining left elements
      .concat(right.slice(rightIndex)); // Append remaining right elements
  };

  // Filter and sort emails based on search query, sorting criteria, and active category
  useEffect(() => {
    const updatedEmails = emails.filter(
      (email) =>
        email.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        email.sender.toLowerCase().includes(searchQuery.toLowerCase()) // Match search query
    );

    setFilteredEmails(mergeSort(updatedEmails, sortCriteria)); // Sort filtered emails

    if (activeCategory !== "Inbox") {
      setFilteredEmails((prevFilteredEmails) =>
        prevFilteredEmails.filter((email) => email.classification.includes(activeCategory)) // Filter by category
      );
    }
  }, [searchQuery, sortCriteria, emails, activeCategory, mergeSort]); // Rerun on dependency change

  // Handle changing the active email category
  const handleCategoryChange = (category) => {
    setActiveCategory(category); // Update active category
    setCurrentPage(1); // Reset to first page
  };

  if (loading) {
    return <p>Loading emails...</p>; // Display while loading
  }

  if (error) {
    return <p>{error}</p>; // Display error message
  }

  // Pagination logic
  const indexOfLastEmail = currentPage * emailsPerPage;
  const indexOfFirstEmail = indexOfLastEmail - emailsPerPage;
  const currentEmails = filteredEmails.slice(indexOfFirstEmail, indexOfLastEmail); // Emails for current page

  const paginate = (pageNumber) => setCurrentPage(pageNumber); // Update current page

  // Toggle compose email modal
  const handleComposeToggle = (mode = "new", email = null) => {
    if (mode === "new") {
      setRecipient("");
      setSubject("");
      setBody("");
    } else if (mode === "reply" && email) {
      setRecipient(email.sender);
      setSubject(`Re: ${email.subject}`);
      setBody(""); // Clear body for reply
    }
    setShowCompose(true);
  };

  // Handle sending an email
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
        credentials: "include", // Include credentials
      });

      const data = await response.json();

      if (data.success) {
        alert("Email Sent!");
        setRecipient("");
        setSubject("");
        setBody("");
        setShowCompose(false);

        fetchEmails(); // Refresh emails after sending
      } else {
        alert("Failed to send email");
      }
    } catch (error) {
      console.error("Error sending email:", error);
      alert("An error occurred while sending the email.");
    }
  };

  // Format date for display
  const formatDateTime = (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString(undefined, options); // Return formatted date
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
            <a href="#drafts" onClick={() => handleCategoryChange("Drafts")}>Drafts</a>
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
                  <p>Classification: {email.classification.join(", ")}</p>
                  <p className="date-time">Date: {formatDateTime(email.date)}</p> {/* Display the formatted date and time */}
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
            <p>Classification: {selectedEmail.classification.join(", ")}</p>
            <p className="date-time">Date: {formatDateTime(selectedEmail.date)}</p> {/* Display the formatted date and time */}
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
                placeholder="From"
                value={userEmail}
                disabled
              />
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


