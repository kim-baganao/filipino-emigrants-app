import React, { useEffect, useState, useMemo } from "react";
import { Treemap, ResponsiveContainer, Tooltip } from "recharts";
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
  Briefcase,
} from "lucide-react";
import { 
  getEmigrantsByOccu, 
  addEmigrantOccu, 
  updateEmigrantOccu, 
  deleteEmigrantOccu 
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
const CustomTooltip = ({ active, payload, totalRaw }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const count = Number(data.value) || 0;
    const pct = totalRaw > 0 ? (count / totalRaw) * 100 : 0;
    
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
          {data.name}
        </p>
        <p style={{ margin: 0, color: '#4b5563' }}>
          Count: {count.toLocaleString()}
        </p>
        <p style={{ margin: '4px 0 0 0', color: '#4b5563' }}>
          Percent: {pct.toFixed(2)}%
        </p>
      </div>
    );
  }
  return null;
};

// Custom Treemap Content Renderer
const CustomTreemapContent = ({ root, depth, x, y, width, height, index, colors, name, value, size }) => {
  // Do not render very small tiles
  if (width < 60 || height < 30) return null;

  // Responsive font size based on tile size
  const padding = 6;
  const fontSize = Math.max(12, Math.min(18, Math.floor(Math.min(width, height) / 8)));
  const approxCharWidth = fontSize * 0.6;
  const maxCharsPerLine = Math.max(4, Math.floor((width - padding * 2) / approxCharWidth));

  // Simple word-wrap to fit the box
  const words = String(name).split(" ");
  const lines = [];
  let current = "";
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    if ((current + (current ? " " : "") + w).length <= maxCharsPerLine) {
      current = current ? current + " " + w : w;
    } else {
      if (current) lines.push(current);
      // If single word longer than max, split it
      if (w.length > maxCharsPerLine) {
        for (let j = 0; j < w.length; j += maxCharsPerLine) {
          lines.push(w.slice(j, j + maxCharsPerLine));
        }
        current = "";
      } else {
        current = w;
      }
    }
  }
  if (current) lines.push(current);

  // Limit number of lines to fit vertically
  const lineHeight = fontSize + 2;
  const maxLines = Math.max(1, Math.floor((height - padding * 2) / lineHeight));
  const displayLines = lines.slice(0, maxLines);
  if (!displayLines.length) return null;

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        style={{
          fill: colors[index % colors.length],
          stroke: '#fff',
          strokeWidth: 2,
        }}
      />
      <text
        x={x + padding}
        y={y + padding + fontSize}
        fill="#ffffff"
        style={{ 
          fontSize, 
          fontWeight: 700, 
          paintOrder: 'stroke', 
          stroke: 'rgba(0,0,0,0.3)', 
          strokeWidth: '2px', 
          strokeLinecap: 'butt', 
          strokeLinejoin: 'miter' 
        }}
      >
        {displayLines.map((ln, idx) => (
          <tspan key={idx} x={x + padding} dy={idx === 0 ? 0 : lineHeight}>
            {ln}
          </tspan>
        ))}
      </text>
    </g>
  );
};

function TreemapPage() {
  const [records, setRecords] = useState([]);
  const [selectedYear, setSelectedYear] = useState("All");
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [csvFileName, setCsvFileName] = useState("");
  const [message, setMessage] = useState({ text: "", type: "" });
  const [loading, setLoading] = useState(false);

  // --- Fields Definition ---
  const occuFields = [
    "Professional",
    "Managerial",
    "Clerical",
    "Sales",
    "Service",
    "Agriculture",
    "Production",
    "Armed Forces",
    "Housewives",
    "Retirees",
    "Students",
    "Minors",
    "Out of School Youth",
    "No Occupation Reported",
  ];
  const allFormFields = ["year", ...occuFields];
  const defaultForm = Object.fromEntries(allFormFields.map(key => [key, ""]));

  const [form, setForm] = useState(defaultForm);

  // Fetch data from service
  const fetchData = async () => {
    setLoading(true);
    try {
      console.log("Starting data fetch...");
      const data = await getEmigrantsByOccu();
      console.log("Data fetched:", data);
      setRecords(data);
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

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleEditChange = (e) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };

  // Helper to create record object from a form
  const getRecordFromForm = (sourceForm) => {
    const record = { year: Number(sourceForm.year) };
    occuFields.forEach(field => {
      record[field] = Number(sourceForm[field]) || 0;
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
      await addEmigrantOccu(newRecord);
      
      setForm(defaultForm);
      await fetchData();
      showMessage("✅ Record added successfully!", "success");
    } catch (error) {
      console.error("Error adding record:", error);
      showMessage("❌ Error adding record", "error");
    }
  };

  const handleEdit = (r) => {
    setEditingId(r.id);
    const formState = { year: String(r.year || "") };
    occuFields.forEach(field => {
      formState[field] = String(r[field] || "");
    });
    setEditForm(formState);
  };

  // UPDATED: Same pattern as BarChartPage - handleSave takes id parameter
  const handleSave = async (id) => {
    try {
      const updatedRecord = getRecordFromForm(editForm);
      console.log("Saving record:", id, updatedRecord);
      await updateEmigrantOccu(id, updatedRecord);
      
      setEditingId(null);
      setEditForm({});
      await fetchData();
      showMessage("✅ Record updated successfully!", "success");
    } catch (error) {
      console.error("Error updating record:", error);
      showMessage("❌ Error updating record", "error");
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this record?")) {
      return;
    }

    try {
      await deleteEmigrantOccu(id);
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
              
              occuFields.forEach(field => {
                // Handle different CSV header naming conventions
                const value = row[field] || 
                             row[field.toLowerCase()] ||
                             row[field.replace(/\s+/g, ' ').toLowerCase()] ||
                             0;
                record[field] = Number(value) || 0;
              });
              
              return record;
            });

          console.log("Processed records:", recordsToAdd);

          // Add records to database
          for (const record of recordsToAdd) {
            await addEmigrantOccu(record);
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
    const totalByOccu = {};
    occuFields.forEach(field => {
      totalByOccu[field] = records.reduce((sum, record) => sum + (record[field] || 0), 0);
    });
    const grandTotal = Object.values(totalByOccu).reduce((sum, value) => sum + value, 0);
    return { ...totalByOccu, total: grandTotal };
  }, [records]);

  // Compute totals for treemap
  const { rawTotals, normalizedTotals } = useMemo(() => {
    const raw = filteredRecords.reduce((acc, cur) => {
      occuFields.forEach((f) => {
        const value = Math.max(Number(cur[f]) || 0, 0);
        acc[f] = (acc[f] || 0) + value;
      });
      return acc;
    }, Object.fromEntries(occuFields.map((f) => [f, 0])));

    const maxValue = Math.max(...Object.values(raw), 1);
    const normalized = Object.fromEntries(
      Object.entries(raw).map(([key, value]) => [key, Math.max(1, Math.round((value / maxValue) * 1000))])
    );

    return { rawTotals: raw, normalizedTotals: normalized };
  }, [filteredRecords]);

  // Total raw count for percentage calculations
  const totalRaw = useMemo(() => {
    return Object.values(rawTotals || {}).reduce((a, b) => a + (b || 0), 0);
  }, [rawTotals]);

  // New color palette
  const THEME_COLORS = [
    '#3b82f6', // Blue
    '#8b5cf6', // Purple
    '#10b981', // Green
    '#60a5fa', // Light Blue
    '#a78bfa', // Light Purple
    '#34d399', // Light Green
    '#0ea5e9', // Sky Blue
    '#c084fc', // Violet
    '#14b8a6', // Teal
    '#93c5fd', // Lighter Blue
    '#c4b5fd', // Lighter Purple
    '#6ee7b7', // Lighter Green
    '#6b7280', // Gray
    '#38bdf8', // Lighter Sky Blue
    '#e879f9', // Fuchsia
  ];

  // Create stable chart data structure
  const chartData = useMemo(() => {
    return occuFields
      .filter((f) => (rawTotals[f] || 0) > 0)
      .map((f, index) => ({
        name: f,
        size: normalizedTotals[f],
        value: Math.round(rawTotals[f] || 0),
      }))
      .sort((a, b) => b.value - a.value); // Sort by real value
  }, [rawTotals, normalizedTotals]);

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
        Emigrants by Occupation
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
          <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Total Professionals</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#3b82f6' }}>
            {totals.Professional.toLocaleString()}
          </div>
        </div>
        <div style={statCardStyle}>
          <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Total Students</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>
            {totals.Students.toLocaleString()}
          </div>
        </div>
        <div style={statCardStyle}>
          <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Total Housewives</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#8b5cf6' }}>
            {totals.Housewives.toLocaleString()}
          </div>
        </div>
        <div style={statCardStyle}>
          <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Total Emigrants</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>
            {totals.total.toLocaleString()}
          </div>
        </div>
      </div>
      
      {/* Treemap Card */}
      <div style={cardStyle}>
        <h3 style={h3Style}><Briefcase size={20} /> Occupation Distribution ({selectedYear})</h3>
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
        <div style={{ width: '100%', height: '450px' }}>
          <ResponsiveContainer>
            <Treemap
              data={chartData}
              dataKey="size"
              ratio={1}
              stroke="#fff"
              isAnimationActive={false}
              content={<CustomTreemapContent colors={THEME_COLORS} />}
            >
              <Tooltip
                content={<CustomTooltip totalRaw={totalRaw} />}
              />
            </Treemap>
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
            gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", 
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
              <table style={{ borderCollapse: "collapse", width: "100%", minWidth: '2400px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f9fafb' }}>
                    <TableCell isHeader>Year</TableCell>
                    {occuFields.map(group => (
                      <TableCell isHeader key={group}>{group}</TableCell>
                    ))}
                    <TableCell isHeader>Total</TableCell>
                    <TableCell isHeader style={{ textAlign: 'right', minWidth: '120px' }}>Actions</TableCell>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r) => {
                    const rowTotal = occuFields.reduce((sum, field) => sum + (r[field] || 0), 0);
                    return (
                      <tr key={r.id} style={{
                        transition: 'background-color 0.2s'
                      }}
                        onMouseEnter={(event) => event.currentTarget.style.backgroundColor = '#f9fafb'}
                        onMouseLeave={(event) => event.currentTarget.style.backgroundColor = 'white'}
                      >
                        {editingId === r.id ? (
                          // Edit mode
                          <>
                            <TableCell>
                              <input
                                name="year"
                                type="number"
                                value={editForm["year"]}
                                onChange={handleEditChange}
                                style={{ ...inputStyle, padding: '4px 8px', fontSize: '14px', width: '90px' }}
                                min="0"
                              />
                            </TableCell>
                            {occuFields.map(field => (
                              <TableCell key={field}>
                                <input
                                  name={field}
                                  type="number"
                                  value={editForm[field]}
                                  onChange={handleEditChange}
                                  style={{ ...inputStyle, padding: '4px 8px', fontSize: '14px', width: '120px' }}
                                  min="0"
                                />
                              </TableCell>
                            ))}
                            <TableCell>
                              {occuFields.reduce((sum, field) => sum + (Number(editForm[field]) || 0), 0).toLocaleString()}
                            </TableCell>
                            <TableCell style={{ textAlign: 'right' }}>
                              {/* UPDATED: Pass r.id directly like in BarChartPage */}
                              <IconButton
                                icon={Save}
                                onClick={() => handleSave(r.id)}
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
                            <TableCell>{r.year || 0}</TableCell>
                            {occuFields.map(group => (
                              <TableCell key={group}>{(r[group] || 0).toLocaleString()}</TableCell>
                            ))}
                            <TableCell>{rowTotal.toLocaleString()}</TableCell>
                            <TableCell style={{ textAlign: 'right' }}>
                              <IconButton
                                icon={Edit}
                                onClick={() => handleEdit(r)}
                                color="#3b82f6"
                                hoverColor="#2563eb"
                                label="Edit"
                              />
                              <IconButton
                                icon={Trash2}
                                onClick={() => handleDelete(r.id)}
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

export default TreemapPage;