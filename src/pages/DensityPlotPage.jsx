import React, { useEffect, useState, useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
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
  Users
} from "lucide-react";
import { 
  getEmigrantsByAge, 
  addEmigrantAge, 
  updateEmigrantAge, 
  deleteEmigrantAge 
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

function DensityPlotPage() {
  const [emigrants, setEmigrants] = useState([]);
  const [selectedYear, setSelectedYear] = useState("All");
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [csvFileName, setCsvFileName] = useState("");
  const [message, setMessage] = useState({ text: "", type: "" });
  const [loading, setLoading] = useState(false);
  
  const ageGroups = [
    "14-Below", "15-19", "20-24", "25-29", "30-34", "35-39", 
    "40-44", "45-49", "50-54", "55-59", "60-64", "65-69", "70-above"
  ];
  const allFormFields = ["year", ...ageGroups];

  const [form, setForm] = useState({
    year: "", "14-Below": "", "15-19": "", "20-24": "", "25-29": "",
    "30-34": "", "35-39": "", "40-44": "", "45-49": "", "50-54": "",
    "55-59": "", "60-64": "", "65-69": "", "70-above": ""
  });

  // Fetch data from service
  const fetchData = async () => {
    setLoading(true);
    try {
      console.log("Starting data fetch...");
      const data = await getEmigrantsByAge();
      console.log("Data fetched:", data);
      setEmigrants(data);
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
  
  // Show a message and clear it after 3 seconds
  const showMessage = (text, type = "success") => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: "", type: "" }), 3000);
  };

  // Handle form input changes
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Handle edit form input changes
  const handleEditChange = (e) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };

  // Create an object with all fields from the form
  const getRecordFromForm = (sourceForm) => {
    const record = { year: Number(sourceForm.year) };
    ageGroups.forEach(group => {
      record[group] = Number(sourceForm[group]) || 0;
    });
    return record;
  };

  // Add new record
  const handleAdd = async () => {
    // Validate required fields
    if (!form.year) {
      showMessage("❌ Year is required", "error");
      return;
    }

    try {
      const newRecord = getRecordFromForm(form);
      console.log("Adding new record:", newRecord);
      await addEmigrantAge(newRecord);
      
      // Reset form
      setForm({
        year: "", "14-Below": "", "15-19": "", "20-24": "", "25-29": "",
        "30-34": "", "35-39": "", "40-44": "", "45-49": "", "50-54": "",
        "55-59": "", "60-64": "", "65-69": "", "70-above": ""
      });
      
      await fetchData();
      showMessage("✅ Record added successfully!", "success");
    } catch (error) {
      console.error("Error adding record:", error);
      showMessage("❌ Error adding record", "error");
    }
  };

  // Start editing a record
  const handleEdit = (emigrant) => {
    setEditingId(emigrant.id);
    const formState = { year: String(emigrant.year || "") };
    ageGroups.forEach(group => {
      formState[group] = String(emigrant[group] || "");
    });
    setEditForm(formState);
  };

  // Save updated record
  const handleSave = async (id) => {
    try {
      const updatedRecord = getRecordFromForm(editForm);
      console.log("Saving record:", id, updatedRecord);
      await updateEmigrantAge(id, updatedRecord);
      
      setEditingId(null);
      setEditForm({});
      await fetchData();
      showMessage("✅ Record updated successfully!", "success");
    } catch (error) {
      console.error("Error updating record:", error);
      showMessage("❌ Error updating record", "error");
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
      await deleteEmigrantAge(id);
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
          const records = results.data
            .filter(row => row.year && !isNaN(Number(row.year))) // Filter valid rows
            .map((row) => {
              const record = { year: Number(row.year) };
              
              ageGroups.forEach(group => {
                // Handle different CSV header naming conventions
                const value = row[group] || 
                             row[group.replace('-', ' ')] || // Handle "14-Below" vs "14 Below"
                             row[group.toLowerCase()] ||
                             0;
                record[group] = Number(value) || 0;
              });
              
              return record;
            });

          console.log("Processed records:", records);

          // Add records to database
          for (const record of records) {
            await addEmigrantAge(record);
          }

          showMessage(`✅ ${records.length} records uploaded successfully!`, "success");
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

  // Available years (for grouping) and selected year filter
  const years = useMemo(() => {
    const ys = Array.from(new Set(emigrants.map((r) => r.year).filter(Boolean))).map(Number);
    ys.sort((a, b) => a - b);
    return ys;
  }, [emigrants]);

  // Filter records by selected year (or use all)
  const filteredRecords = useMemo(() => {
    if (selectedYear === "All") return emigrants;
    return emigrants.filter((r) => Number(r.year) === Number(selectedYear));
  }, [emigrants, selectedYear]);

  // Calculate totals for display
  const totals = useMemo(() => {
    const totalByAgeGroup = {};
    ageGroups.forEach(group => {
      totalByAgeGroup[group] = emigrants.reduce((sum, emigrant) => sum + (emigrant[group] || 0), 0);
    });
    const grandTotal = Object.values(totalByAgeGroup).reduce((sum, value) => sum + value, 0);
    return { ...totalByAgeGroup, total: grandTotal };
  }, [emigrants]);

  // Prepare data for density plot
  const densityData = ageGroups.map((ageGroup) => {
    const total = filteredRecords.reduce((sum, emigrant) => sum + (emigrant[ageGroup] || 0), 0);
    return {
      ageGroup,
      total,
    };
  });

  // Colors for the density plot
  const gradientColors = {
    start: '#8884d8',
    end: '#82ca9d'
  };
  
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
        Age Distribution of Filipino Emigrants
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
          <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Total Children (14-Below)</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#3b82f6' }}>
            {totals["14-Below"].toLocaleString()}
          </div>
        </div>
        <div style={statCardStyle}>
          <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Total Working Age (15-64)</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>
            {ageGroups.slice(1, 11).reduce((sum, group) => sum + totals[group], 0).toLocaleString()}
          </div>
        </div>
        <div style={statCardStyle}>
          <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Total Seniors (65+)</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#8b5cf6' }}>
            {ageGroups.slice(11).reduce((sum, group) => sum + totals[group], 0).toLocaleString()}
          </div>
        </div>
        <div style={statCardStyle}>
          <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Total Emigrants</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>
            {totals.total.toLocaleString()}
          </div>
        </div>
      </div>
      
      {/* Density Plot Card */}
      <div style={cardStyle}>
        <h3 style={h3Style}><Users size={20} /> Age Distribution ({selectedYear})</h3>
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
        <ResponsiveContainer width="100%" height={350}>
          <AreaChart
            data={densityData}
            margin={{ top: 5, right: 20, left: -10, bottom: 5 }}
          >
            {/* Gradient definition */}
            <defs>
              <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={gradientColors.start} stopOpacity={0.8}/>
                <stop offset="95%" stopColor={gradientColors.end} stopOpacity={0.3}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
            <XAxis 
              dataKey="ageGroup" 
              fontSize={12} 
              tickLine={false} 
              axisLine={false} 
              padding={{ left: 10, right: 10 }}
            />
            <YAxis 
              fontSize={12} 
              tickLine={false} 
              axisLine={false} 
              tickFormatter={(value) => value.toLocaleString()}
            />
            <Tooltip 
              formatter={(value) => [value.toLocaleString(), 'Total Emigrants']}
              labelFormatter={(label) => `Age Group: ${label}`}
              cursor={{ fill: 'rgba(239, 246, 255, 0.7)' }}
              contentStyle={{ borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb' }}
            />
            <Legend wrapperStyle={{ fontSize: '14px', paddingTop: '10px' }} />
            <Area
              type="monotone"
              dataKey="total"
              stroke={gradientColors.start}
              fillOpacity={1}
              fill="url(#colorTotal)"
              name="Total Emigrants"
            />
          </AreaChart>
        </ResponsiveContainer>
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
            gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", 
            gap: "12px", 
            marginBottom: "16px" 
          }}>
            {allFormFields.map((key) => (
              <input
                key={key}
                name={key}
                type="number"
                placeholder={key.replace(/-/g, ' ')} // "14-Below" -> "14 Below"
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
          <h4 style={h3Style}>Current Records ({emigrants.length})</h4>
          {emigrants.length === 0 ? (
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
              <table style={{ borderCollapse: "collapse", width: "100%", minWidth: '1800px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f9fafb' }}>
                    <TableCell isHeader>Year</TableCell>
                    {ageGroups.map(group => (
                      <TableCell isHeader key={group}>{group}</TableCell>
                    ))}
                    <TableCell isHeader>Total</TableCell>
                    <TableCell isHeader style={{ textAlign: 'right', minWidth: '120px' }}>Actions</TableCell>
                  </tr>
                </thead>
                <tbody>
                  {emigrants.map((e) => {
                    const rowTotal = ageGroups.reduce((sum, group) => sum + (e[group] || 0), 0);
                    return (
                      <tr key={e.id} style={{
                        transition: 'background-color 0.2s'
                      }}
                        onMouseEnter={(event) => event.currentTarget.style.backgroundColor = '#f9fafb'}
                        onMouseLeave={(event) => event.currentTarget.style.backgroundColor = 'white'}
                      >
                        {editingId === e.id ? (
                          // Edit mode
                          <>
                            {allFormFields.map(field => (
                              <TableCell key={field}>
                                <input
                                  name={field}
                                  type="number"
                                  value={editForm[field]}
                                  onChange={handleEditChange}
                                  style={{ ...inputStyle, padding: '4px 8px', fontSize: '14px', width: '90px' }}
                                  min="0"
                                />
                              </TableCell>
                            ))}
                            <TableCell>
                              {ageGroups.reduce((sum, group) => sum + (Number(editForm[group]) || 0), 0).toLocaleString()}
                            </TableCell>
                            <TableCell style={{ textAlign: 'right' }}>
                              <IconButton
                                icon={Save}
                                onClick={() => handleSave(e.id)}
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
                            <TableCell>{e.year || 0}</TableCell>
                            {ageGroups.map(group => (
                              <TableCell key={group}>{(e[group] || 0).toLocaleString()}</TableCell>
                            ))}
                            <TableCell>{rowTotal.toLocaleString()}</TableCell>
                            <TableCell style={{ textAlign: 'right' }}>
                              <IconButton
                                icon={Edit}
                                onClick={() => handleEdit(e)}
                                color="#3b82f6"
                                hoverColor="#2563eb"
                                label="Edit"
                              />
                              <IconButton
                                icon={Trash2}
                                onClick={() => handleDelete(e.id)}
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
}

export default DensityPlotPage;