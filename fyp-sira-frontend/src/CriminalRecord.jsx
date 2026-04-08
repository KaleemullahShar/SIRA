import React, { useState, useEffect } from "react";
import { FaSearch, FaPlus, FaTimes, FaEdit, FaTrash } from "react-icons/fa";
import { apiFetch } from "./utils/api";
import "./App.css";

function CriminalRecords() {
  const [records, setRecords] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [newRecord, setNewRecord] = useState({
    name: "",
    cnic: "",
    phone: "",
    crimeType: "",
    date: "",
    status: "active",
  });

  // ✅ Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const recordsPerPage = 10;

  // ✅ Load records from backend
  useEffect(() => {
    fetchRecords();
  }, [currentPage, search]);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const searchQuery = search ? `&search=${encodeURIComponent(search)}` : "";
      const response = await apiFetch(`/criminal/records?page=${currentPage}&limit=${recordsPerPage}${searchQuery}`);

      if (response.success) {
        setRecords(response.data.records);
        setTotalRecords(response.data.pagination.totalRecords);
      } else {
        console.error("Failed to fetch records:", response.error?.message);
        setRecords([]);
      }
    } catch (error) {
      console.error("Error fetching criminal records:", error);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  // ✅ CNIC validation
  const validateCNIC = (cnic) => {
    const cnicRegex = /^[0-9]{5}-[0-9]{7}-[0-9]$/;
    return cnicRegex.test(cnic);
  };

  // ✅ Add or Update Record
  const handleSave = async () => {
    if (
      !newRecord.name ||
      !newRecord.cnic ||
      !newRecord.phone ||
      !newRecord.crimeType ||
      !newRecord.date
    ) {
      alert("Please fill all fields");
      return;
    }

    if (!validateCNIC(newRecord.cnic)) {
      alert("Invalid CNIC format. Use: 12345-1234567-1");
      return;
    }

    try {
      const method = editingId ? 'PUT' : 'POST';
      const endpoint = editingId ? `/criminal/records/${editingId}` : '/criminal/records';

      const response = await apiFetch(endpoint, {
        method,
        body: JSON.stringify(newRecord)
      });

      if (response.success) {
        setShowModal(false);
        fetchRecords();
        setNewRecord({
          name: "",
          cnic: "",
          phone: "",
          crimeType: "",
          date: "",
          status: "Active",
        });
        setEditingId(null);
      } else {
        alert(response.error?.message || "Operation failed");
      }
    } catch (error) {
      alert("An error occurred. Please try again.");
    }
  };

  // ✅ Open Edit Popup
  const handleEdit = (record) => {
    setEditingId(record._id);
    setNewRecord({
      name: record.name,
      cnic: record.cnic,
      phone: record.phone,
      crimeType: record.crimeType,
      date: record.date ? record.date.split('T')[0] : "",
      status: record.status || "active",
    });
    setShowModal(true);
  };

  // ✅ Delete Record
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this record?")) return;

    try {
      const response = await apiFetch(`/criminal/records/${id}`, {
        method: 'DELETE'
      });

      if (response.success) {
        fetchRecords();
      }
    } catch (error) {
      alert("Failed to delete record");
    }
  };

  const totalPages = Math.ceil(totalRecords / recordsPerPage);

  return (
    <div className="page-container">
      <h2 className="page-title">Criminal Records</h2>
      <p className="page-subtitle">Manage and search criminal database</p>

      <div className="white-card">
        {/* ✅ Search + Add Button */}
        <div className="top-row">
          <div className="search-input">
            <FaSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search by name, CNIC, phone, or crime type"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          <button
            className="add-btn"
            onClick={() => {
              setEditingId(null);
              setNewRecord({
                name: "",
                cnic: "",
                phone: "",
                crimeType: "",
                date: "",
                status: "active",
              });
              setShowModal(true);
            }}
          >
            <FaPlus /> Add Record
          </button>
        </div>

        {/* ✅ Table */}
        <div className="table-responsive">
          <table className="styled-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>CNIC</th>
                <th>Phone</th>
                <th>Crime Type</th>
                <th>Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr><td colSpan="7" className="empty-message">Loading records...</td></tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan="7" className="empty-message">No criminal records found.</td>
                </tr>
              ) : (
                records.map((r) => (
                  <tr key={r._id}>
                    <td>{r.name}</td>
                    <td>{r.cnic}</td>
                    <td>{r.phone}</td>
                    <td>{r.crimeType}</td>
                    <td>{r.date ? new Date(r.date).toLocaleDateString() : 'N/A'}</td>
                    <td>
                      <span className={`status-badge ${r.status?.toLowerCase() || 'active'}`}>
                        {r.status ? r.status.charAt(0).toUpperCase() + r.status.slice(1) : 'Active'}
                      </span>
                    </td>
                    <td>
                      <button className="edit-btn" onClick={() => handleEdit(r)}>
                        <FaEdit />
                      </button>
                      <button className="delete-btn" onClick={() => handleDelete(r._id)}>
                        <FaTrash />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ✅ Pagination UI */}
        {totalPages > 1 && (
          <div className="pagination">
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                className={currentPage === i + 1 ? "page-btn active" : "page-btn"}
                onClick={() => setCurrentPage(i + 1)}
              >
                {i + 1}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ✅ POPUP MODAL (Add + Edit Shared) */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div className="modal-header">
              <h3>{editingId ? "Edit Record" : "Add Record"}</h3>
              <FaTimes className="close-icon" onClick={() => setShowModal(false)} />
            </div>

            <div className="modal-body">
              <input
                type="text"
                placeholder="Full Name"
                value={newRecord.name}
                onChange={(e) => setNewRecord({ ...newRecord, name: e.target.value })}
              />

              <input
                type="text"
                placeholder="CNIC (12345-1234567-1)"
                value={newRecord.cnic}
                onChange={(e) => setNewRecord({ ...newRecord, cnic: e.target.value })}
              />

              <input
                type="text"
                placeholder="Phone"
                value={newRecord.phone}
                onChange={(e) => setNewRecord({ ...newRecord, phone: e.target.value })}
              />

              <input
                type="text"
                placeholder="Crime Type"
                value={newRecord.crimeType}
                onChange={(e) => setNewRecord({ ...newRecord, crimeType: e.target.value })}
              />

              <input
                type="date"
                max={new Date().toISOString().split("T")[0]}
                value={newRecord.date}
                onChange={(e) => setNewRecord({ ...newRecord, date: e.target.value })}
              />

              <select
                value={newRecord.status}
                onChange={(e) => setNewRecord({ ...newRecord, status: e.target.value })}
              >
                <option value="active">Active</option>
                <option value="closed">Closed</option>
              </select>

              <button className="save-btn" onClick={handleSave}>
                {editingId ? "Update Record" : "Save Record"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CriminalRecords;
