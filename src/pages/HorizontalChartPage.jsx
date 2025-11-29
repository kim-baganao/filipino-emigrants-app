import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Papa from "papaparse";
import {
  Upload,
  Database,
  Plus,
  Save,
  X,
  Trash2,
  Edit,
  FileInput,
  GraduationCap
} from "lucide-react";
import { 
  getEmigrantsByEdu, 
  addEmigrantEdu, 
  updateEmigrantEdu, 
  deleteEmigrantEdu 
} from "../services/emigrantsService";

// Helper component for styled buttons
function IconButton({ icon: Icon, onClick, color = "#6b7280", hoverColor = "#4b5563", label }) {
  const [isHovered, setIsHovered] = useState(false);
  return (
    <button
      aria-label={label}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '4px',
        margin: '0 4px',
        color: isHovered ? hoverColor : color,
        transition: 'color 0.2s',
      }}
    >
      <Icon size={18} />
    </button>
  );
}

function TableCell({ children, isHeader = false, style = {} }) {
  const cellStyle = {
    padding: '12px 16px',
    textAlign: 'left',
    fontSize: isHeader ? '12px' : '14px',
    fontWeight: isHeader ? '600' : '400',
    color: isHeader ? '#6b7280' : '#1f2937',
    textTransform: isHeader ? 'uppercase' : 'none',
    letterSpacing: isHeader ? '0.05em' : 'normal',
    borderTop: isHeader ? 'none' : '1px solid #e5e7eb',
    ...style,
  };

  return isHeader ? <th style={cellStyle}>{children}</th> : <td style={cellStyle}>{children}</td>;
}

// Custom Tooltip Content
const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        border: '1px solid #e5e7eb',
        padding: '12px',
        fontSize: '14px'
      }}>
        <p style={{ margin: 0, fontWeight: 'bold', color: '#1f2937', marginBottom: '4px' }}>
          {data.payload.name}
        </p>
        <p style={{ margin: 0, color: '#4b5563' }}>
          Count: {data.value.toLocaleString()}
        </p>
      </div>
    );
  }
  return null;
};

const HorizontalChartPage = () => {
  const [records, setRecords] = useState([]);
  const [selectedYear, setSelectedYear] = useState("All");
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [csvFileName, setCsvFileName] = useState("");
  const [message, setMessage] = useState({ text: "", type: "" });
  const [loading, setLoading] = useState(false);

  // --- Fields Definition ---
  // Define field mappings for display names to safe field names
  const eduFieldMappings = {
    "Not of Schooling Age": "notOfSchoolingAge",
    "No Formal Education": "noFormalEducation", 
    "Elementary Level": "elementaryLevel",
    "Elementary Graduate": "elementaryGraduate",
    "High School Level": "highSchoolLevel",
    "High School Graduate": "highSchoolGraduate",
    "Vocational Level": "vocationalLevel",
    "Vocational Graduate": "vocationalGraduate",
    "College Level": "collegeLevel",
    "College Graduate": "collegeGraduate",
    "Post Graduate Level": "postGraduateLevel",
    "Post Graduate": "postGraduate",
    "Non-Formal Education": "nonFormalEducation",
    "Not Reported / No Response": "notReportedNoResponse"
  };

  // Display names for UI
  const eduDisplayNames = [
    "Not of Schooling Age",
    "No Formal Education",
    "Elementary Level",
    "Elementary Graduate",
    "High School Level",
    "High School Graduate",
    "Vocational Level",
    "Vocational Graduate",
    "College Level",
    "College Graduate",
    "Post Graduate Level",
    "Post Graduate",
    "Non-Formal Education",
    "Not Reported / No Response"
  ];

  // Safe field names for Firebase
  const eduSafeFields = Object.values(eduFieldMappings);
  const allFormFields = ["year", ...eduDisplayNames];
  const defaultForm = Object.fromEntries(allFormFields.map(key => [key, ""]));

  const [form, setForm] = useState(defaultForm);
  
  const fetchData = async () => {
    setLoading(true);
    try {
      console.log("Starting data fetch...");
      const fetchedData = await getEmigrantsByEdu();
      console.log("Data fetched:", fetchedData);
      setRecords(fetchedData);
    } catch (error) {
      console.error("Error fetching data:", error);
      showMessage("❌ Error fetching data", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const showMessage = (text, type = "success") => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: "", type: "" }), 3000);
  };

  // Available years
  const years = useMemo(() => {
    const ys = Array.from(new Set(records.map((r) => r.year).filter(Boolean))).map(Number);
    ys.sort((a, b) => a - b);
    return ys;
  }, [records]);

  // Filter records by selected year
  const filteredRecords = useMemo(() => {
    if (selectedYear === "All") return records;
    return records.filter((r) => Number(r.year) === Number(selectedYear));
  }, [records, selectedYear]);

  // Calculate totals for display
  const totals = useMemo(() => {
    const totalByEdu = {};
    eduDisplayNames.forEach(displayName => {
      const safeField = eduFieldMappings[displayName];
      totalByEdu[displayName] = records.reduce((sum, record) => sum + (record[safeField] || 0), 0);
    });
    const grandTotal = Object.values(totalByEdu).reduce((sum, value) => sum + value, 0);
    return { ...totalByEdu, total: grandTotal };
  }, [records]);

  // Handle form input changes
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Handle edit form input changes
  const handleEditChange = (e) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };

  // Helper function to convert display data to safe Firebase data
  const convertToSafeData = (sourceForm) => {
    const record = { year: Number(sourceForm.year) };
    
    eduDisplayNames.forEach(displayName => {
      const safeField = eduFieldMappings[displayName];
      record[safeField] = Number(sourceForm[displayName]) || 0;
    });
    
    return record;
  };

  // Helper function to convert safe Firebase data to display data
  const convertToDisplayData = (firebaseRecord) => {
    const displayData = { year: String(firebaseRecord.year || "") };
    
    eduDisplayNames.forEach(displayName => {
      const safeField = eduFieldMappings[displayName];
      displayData[displayName] = String(firebaseRecord[safeField] || "");
    });
    
    return displayData;
  };

  // Add new record
  const handleAdd = async () => {
    // Validate required fields
    if (!form.year) {
      showMessage("❌ Year is required", "error");
      return;
    }

    try {
      const newRecord = convertToSafeData(form);
      console.log("Adding new record:", newRecord);
      await addEmigrantEdu(newRecord);
      
      // Reset form
      setForm(defaultForm);
      
      // Refresh data
      await fetchData();
      showMessage("✅ Record added successfully!", "success");
    } catch (error) {
      console.error("Error adding record:", error);
      showMessage("❌ Error adding record", "error");
    }
  };

  // Start editing a record
  const handleEdit = (item) => {
    console.log("Editing item:", item);
    setEditingId(item.id);
    const displayData = convertToDisplayData(item);
    setEditForm(displayData);
  };

  // FIXED: Save updated record with proper data conversion
  const handleSave = async (id) => {
    try {
      console.log("=== SAVE DEBUG ===");
      console.log("Record ID:", id);
      console.log("Edit form data:", editForm);
      
      // Validate ID
      if (!id) {
        console.error("No ID provided for update");
        showMessage("❌ Error: No record ID found", "error");
        return;
      }

      // Validate year
      if (!editForm.year || isNaN(Number(editForm.year))) {
        showMessage("❌ Please enter a valid year", "error");
        return;
      }

      // Convert display data to safe Firebase data
      const updatedRecord = convertToSafeData(editForm);
      
      console.log("Safe record to update:", updatedRecord);
      
      // Call the update function
      await updateEmigrantEdu(id, updatedRecord);
      
      console.log("Update successful");
      setEditingId(null);
      setEditForm({});
      await fetchData();
      showMessage("✅ Record updated successfully!", "success");
    } catch (error) {
      console.error("=== UPDATE ERROR ===");
      console.error("Error details:", error);
      console.error("Error message:", error.message);
      console.error("Error code:", error.code);
      
      let errorMessage = "❌ Error updating record";
      
      if (error.code) {
        switch (error.code) {
          case 'not-found':
            errorMessage = "❌ Record not found in database";
            break;
          case 'permission-denied':
            errorMessage = "❌ Permission denied - check Firebase rules";
            break;
          case 'invalid-argument':
            errorMessage = "❌ Invalid data format - check field names";
            break;
          default:
            errorMessage = `❌ Database error: ${error.code}`;
        }
      }
      
      showMessage(errorMessage, "error");
    }
  };

  // Cancel editing
  const handleCancel = () => {
    setEditingId(null);
    setEditForm({});
  };

  // Delete record
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this record?")) {
      return;
    }

    try {
      await deleteEmigrantEdu(id);
      await fetchData();
      showMessage("🗑️ Record deleted successfully!", "success");
    } catch (error) {
      console.error("Error deleting record:", error);
      showMessage("❌ Error deleting record.", "error");
    }
  };

  // 📤 Fixed CSV Upload Handler
  const handleCSVUpload = (e) => {
    const file = e.target.files[0];
    if (!file) {
      setCsvFileName("");
      return;
    }

    // Validate file type
    if (!file.name.toLowerCase().endsWith('.csv')) {
      showMessage("❌ Please select a CSV file", "error");
      e.target.value = '';
      return;
    }

    setCsvFileName(file.name);
    console.log("Processing CSV file:", file.name);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        console.log("CSV parse results:", results);
        
        if (results.errors.length > 0) {
          console.error("CSV parse errors:", results.errors);
          showMessage("❌ Error parsing CSV file", "error");
          setCsvFileName("");
          e.target.value = null;
          return;
        }

        try {
          const recordsToAdd = results.data
            .filter(row => row.year || row.Year) // Filter valid rows
            .map((row) => {
              const record = { year: Number(row.year || row.Year) || 0 };
              
              // Handle CSV headers - try both display names and safe names
              eduDisplayNames.forEach(displayName => {
                const safeField = eduFieldMappings[displayName];
                
                // Try different header naming conventions
                const value = row[displayName] || 
                             row[safeField] ||
                             row[displayName.toLowerCase()] ||
                             row[safeField.toLowerCase()] ||
                             0;
                record[safeField] = Number(value) || 0;
              });
              
              return record;
            });

          console.log("Processed records:", recordsToAdd);

          // Add records to database
          for (const record of recordsToAdd) {
            await addEmigrantEdu(record);
          }

          showMessage(`✅ ${recordsToAdd.length} records uploaded successfully!`, "success");
          await fetchData();
        } catch (error) {
          console.error("Error processing CSV:", error);
          showMessage("❌ Error processing CSV data", "error");
        } finally {
          setCsvFileName("");
          e.target.value = null;
        }
      },
      error: (error) => {
        console.error("CSV parse error:", error);
        showMessage("❌ Error reading CSV file", "error");
        setCsvFileName("");
        e.target.value = null;
      }
    });
  };

  // Process data for chart
  const chartData = useMemo(() => {
    return eduDisplayNames.map(displayName => {
      const safeField = eduFieldMappings[displayName];
      return {
        name: displayName,
        total: filteredRecords.reduce((sum, item) => sum + (item[safeField] || 0), 0)
      };
    }).sort((a, b) => a.total - b.total); // Sort ascending for horizontal chart
  }, [filteredRecords]);

  // --- Styles ---
  const cardStyle = {
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    padding: '24px',
  };

  const h3Style = {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 0,
    marginBottom: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  };

  const inputStyle = {
    padding: '8px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    width: '100%',
    boxSizing: 'border-box',
  };

  const buttonStyle = {
    backgroundColor: '#3b82f6',
    color: 'white',
    padding: '10px 20px',
    borderRadius: '8px',
    fontWeight: '600',
    border: 'none',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  };
  
  const fileInputLabelStyle = {
    ...buttonStyle,
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: 'white',
    color: '#3b82f6',
    border: '1px solid #3b82f6',
  };

  const statCardStyle = {
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    padding: '16px',
    border: '1px solid #e2e8f0',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <h1 style={{ 
        fontSize: '30px', 
        fontWeight: 'bold',
        color: '#1f2937', 
        margin: 0 
      }}>
        Education of Filipino Emigrants
      </h1>

      {loading && (
        <div style={{ 
          padding: '16px', 
          backgroundColor: '#f0f9ff', 
          border: '1px solid #bae6fd',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          Loading data...
        </div>
      )}

      {/* Summary Statistics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <div style={statCardStyle}>
          <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Total College Graduates</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#3b82f6' }}>
            {totals["College Graduate"].toLocaleString()}
          </div>
        </div>
        <div style={statCardStyle}>
          <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Total High School Graduates</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>
            {totals["High School Graduate"].toLocaleString()}
          </div>
        </div>
        <div style={statCardStyle}>
          <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Total Post Graduates</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#8b5cf6' }}>
            {totals["Post Graduate"].toLocaleString()}
          </div>
        </div>
        <div style={statCardStyle}>
          <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Total Emigrants</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>
            {totals.total.toLocaleString()}
          </div>
        </div>
      </div>
      
      {/* Chart Card */}
      <div style={cardStyle}>
        <h3 style={h3Style}><GraduationCap size={20} /> Education Distribution ({selectedYear})</h3>
        <div style={{ margin: '16px 0 24px 0', display: 'flex', alignItems: 'center', gap: 12 }}>
          <label style={{ fontSize: 14, fontWeight: '500', color: '#4b5563' }}>Filter by Year:</label>
          <select 
            value={selectedYear} 
            onChange={(e) => setSelectedYear(e.target.value)} 
            style={{ 
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              backgroundColor: 'white',
              fontSize: '14px'
            }}
          >
            <option value="All">All Years (Totals)</option>
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        
        <div style={{ height: '700px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 160, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
              <XAxis
                type="number"
                fontSize={12} 
                tickLine={false} 
                axisLine={false} 
                tickFormatter={(value) => value.toLocaleString()}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={150} // Adjust width for labels
                tick={{ fontSize: 12, fill: '#4b5563' }}
                tickLine={false} 
                axisLine={false}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ fill: 'rgba(239, 246, 255, 0.7)' }}
              />
              <Legend wrapperStyle={{ fontSize: '14px', paddingTop: '10px' }} />
              <Bar
                dataKey="total"
                fill="#8884d8" // Color from density plot
                name="Total Emigrants"
                barSize={20}
                radius={[0, 4, 4, 0]} // Rounded corners
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Data Management Card */}
      <div style={cardStyle}>
        <h3 style={h3Style}><Database size={20} /> Manage Data</h3>
        
        {/* Upload Section */}
        <div style={{ marginBottom: '24px' }}>
          <h4 style={h3Style}><Upload size={18} /> Upload CSV</h4>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <label style={fileInputLabelStyle}>
              <FileInput size={16} />
              Choose File
              <input
                type="file"
                accept=".csv"
                onChange={handleCSVUpload}
                style={{ display: "none" }}
              />
            </label>
            {csvFileName && <span style={{ fontSize: '14px', color: '#6b7280' }}>{csvFileName}</span>}
            {message.text && (
              <span style={{ 
                fontSize: '14px', 
                color: message.type === 'success' ? '#10b981' : '#ef4444',
                fontWeight: '500'
              }}>
                {message.text}
              </span>
            )}
          </div>
        </div>

        {/* Add New Record Section */}
        <div style={{ marginBottom: '24px' }}>
          <h4 style={h3Style}><Plus size={18} /> Add New Record</h4>
          <div style={{ 
            display: "grid", 
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", 
            gap: "12px", 
            marginBottom: "16px" 
          }}>
            {allFormFields.map((key) => (
              <input
                key={key}
                name={key}
                type="number"
                placeholder={key.replace(/-/g, ' ')}
                value={form[key]}
                onChange={handleChange}
                style={inputStyle}
                min="0"
              />
            ))}
          </div>
           <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button 
              onClick={handleAdd} 
              style={buttonStyle}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
              disabled={!form.year}
            >
              Add Record
            </button>
          </div>
        </div>

        {/* Records Table Section */}
        <div>
          <h4 style={h3Style}>Current Records ({records.length})</h4>
          {records.length === 0 ? (
            <div style={{ 
              padding: '40px', 
              textAlign: 'center', 
              color: '#6b7280',
              border: '1px dashed #d1d5db',
              borderRadius: '8px'
            }}>
              No records found. Add some data to get started.
            </div>
          ) : (
            <div style={{ overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
              <table style={{ borderCollapse: "collapse", width: "100%", minWidth: '2800px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f9fafb' }}>
                    <TableCell isHeader>Year</TableCell>
                    {eduDisplayNames.map(displayName => (
                      <TableCell isHeader key={displayName}>{displayName}</TableCell>
                    ))}
                    <TableCell isHeader>Total</TableCell>
                    <TableCell isHeader style={{ textAlign: 'right', minWidth: '120px' }}>Actions</TableCell>
                  </tr>
                </thead>
                <tbody>
                  {records.map((item) => {
                    const rowTotal = eduSafeFields.reduce((sum, safeField) => sum + (item[safeField] || 0), 0);
                    return (
                      <tr key={item.id} style={{
                        transition: 'background-color 0.2s'
                      }}
                        onMouseEnter={(event) => event.currentTarget.style.backgroundColor = '#f9fafb'}
                        onMouseLeave={(event) => event.currentTarget.style.backgroundColor = 'white'}
                      >
                        {editingId === item.id ? (
                          // Edit mode
                          <>
                            {allFormFields.map(field => (
                              <TableCell key={field}>
                                <input
                                  name={field}
                                  type="number"
                                  value={editForm[field]}
                                  onChange={handleEditChange}
                                  style={{ ...inputStyle, padding: '4px 8px', fontSize: '14px', width: field === 'year' ? '90px' : '120px' }}
                                  min="0"
                                />
                              </TableCell>
                            ))}
                            <TableCell>
                              {eduDisplayNames.reduce((sum, displayName) => sum + (Number(editForm[displayName]) || 0), 0).toLocaleString()}
                            </TableCell>
                            <TableCell style={{ textAlign: 'right' }}>
                              <IconButton
                                icon={Save}
                                onClick={() => {
                                  console.log("Save clicked for item:", item);
                                  handleSave(item.id);
                                }}
                                color="#10b981"
                                hoverColor="#059669"
                                label="Save"
                              />
                              <IconButton
                                icon={X}
                                onClick={handleCancel}
                                color="#6b7280"
                                hoverColor="#4b5563"
                                label="Cancel"
                              />
                            </TableCell>
                          </>
                        ) : (
                          // View mode
                          <>
                            <TableCell>{item.year || 0}</TableCell>
                            {eduDisplayNames.map(displayName => {
                              const safeField = eduFieldMappings[displayName];
                              return (
                                <TableCell key={displayName}>
                                  {(item[safeField] || 0).toLocaleString()}
                                </TableCell>
                              );
                            })}
                            <TableCell>{rowTotal.toLocaleString()}</TableCell>
                            <TableCell style={{ textAlign: 'right' }}>
                              <IconButton
                                icon={Edit}
                                onClick={() => handleEdit(item)}
                                color="#3b82f6"
                                hoverColor="#2563eb"
                                label="Edit"
                              />
                              <IconButton
                                icon={Trash2}
                                onClick={() => handleDelete(item.id)}
                                color="#ef4444"
                                hoverColor="#dc2626"
                                label="Delete"
                              />
                            </TableCell>
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HorizontalChartPage;