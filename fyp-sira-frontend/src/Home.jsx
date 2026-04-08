import React from "react";
import "./App.css";

function Home() {
  return (
    <div className="home-page">
      {/* Intro Section */}
      <section className="intro-section">
        <h1>Smart Investigation & Record Analyzer</h1>
        <p className="subtitle">
          Advanced investigative tools for law enforcement professionals
        </p>
      </section>

      {/* About Section */}
      <section className="about-section">
        <h2>About SIRA</h2>
        <p>
          The Smart Investigation & Record Analyzer (SIRA) is a comprehensive
          platform designed for law enforcement agencies to streamline
          investigative processes. This system provides investigators with
          powerful tools to analyze communication records, manage criminal
          databases, and generate official reports.
        </p>
        <p>
          Built with security and efficiency in mind, SIRA ensures data integrity
          while providing an intuitive interface for complex investigative tasks.
        </p>
      </section>

      {/* Features */}
      <section className="features-grid">
        <div className="feature-card">
          <div className="feature-icon">📞</div>
          <h3>CDR Analysis</h3>
          <p>
            Analyze Call Detail Records with advanced filtering and visualization
            tools for investigative purposes.
          </p>
        </div>

        <div className="feature-card">
          <div className="feature-icon">🧾</div>
          <h3>Criminal Records Management</h3>
          <p>
            Maintain comprehensive database of criminal records with search and
            categorization capabilities.
          </p>
        </div>

        <div className="feature-card">
          <div className="feature-icon">📊</div>
          <h3>Report Generation</h3>
          <p>
            Generate detailed investigative reports with charts and export to PDF
            for official documentation.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="official-note">
        ⚠️ Official Use Only — This system is restricted to authorized law
        enforcement personnel. All activities are logged and monitored for
        security purposes.
      </footer>
    </div>
  );
}

export default Home;