import React, { useEffect, useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
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
} from "lucide-react";
import { 
getEmigrants, 
addEmigrant, 
updateEmigrant, 
deleteEmigrant 
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

function BarChartPage() {
  const [emigrants, setEmigrants] = useState([]);
  const [selectedYear, setSelectedYear] = useState("All");
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [csvFileName, setCsvFileName] = useState("");
  const [message, setMessage] = useState({ text: "", type: "" });
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    year: "",
    single: "",
    married: "",
    widower: "",
    separated: "",
    divorced: "",
    notReported: ""
  });

  const civilStatusFields = ["single", "married", "widower", "separated", "divorced", "notReported"];
  const allFormFields = ["year", ...civilStatusFields];

  // Fetch data from service
  const fetchData = async () => {
    setLoading(true);
    try {
      console.log("Starting data fetch...");
      const data = await getEmigrants();
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

  // Add new record
  const handleAdd = async () => {
    // Validate required fields
    if (!form.year) {
      showMessage("❌ Year is required", "error");
      return;
    }

    try {
      const newRecord = {
        year: Number(form.year),
      };
      
      civilStatusFields.forEach(field => {
        newRecord[field] = Number(form[field]) || 0;
      });

      console.log("Adding new record:", newRecord);
      await addEmigrant(newRecord);
      
      // Reset form
      setForm({ year: "", single: "", married: "", widower: "", separated: "", divorced: "", notReported: "" });
      
      // Refresh data
      await fetchData();
      showMessage("✅ Record added successfully!", "success");
    } catch (error) {
      console.error("Error adding record:", error);
      showMessage("❌ Error adding record", "error");
    }
  };

  const handleEdit = (emigrant) => {
    setEditingId(emigrant.id);
    const formState = {};
    allFormFields.forEach(field => {
      formState[field] = String(emigrant[field] || "");
    });
    setEditForm(formState);
  };

  const handleSave = async (id) => {
    try {
      const updatedRecord = {
        year: Number(editForm.year),
      };
      civilStatusFields.forEach(field => {
        updatedRecord[field] = Number(editForm[field]) || 0;
      });

      console.log("Saving record:", id, updatedRecord);
      await updateEmigrant(id, updatedRecord);
      
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
      await deleteEmigrant(id);
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
              
              civilStatusFields.forEach(field => {
                // Handle different CSV header naming conventions
                const value = row[field] || 
                             row[field.charAt(0).toUpperCase() + field.slice(1)] ||
                             row[field.replace(/([A-Z])/g, ' $1').trim()] ||
                             0;
                record[field] = Number(value) || 0;
              });
              
              return record;
            });

          console.log("Processed records:", records);

          // Add records to database
          for (const record of records) {
            await addEmigrant(record);
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

  // Available years and filtered records
  const years = useMemo(() => {
    const ys = Array.from(new Set(emigrants.map((r) => r.year).filter(Boolean))).map(Number);
    ys.sort((a, b) => a - b);
    return ys;
  }, [emigrants]);

  const filteredRecords = useMemo(() => {
    if (selectedYear === "All") return emigrants;
    return emigrants.filter((r) => Number(r.year) === Number(selectedYear));
  }, [emigrants, selectedYear]);

  const totals = filteredRecords.reduce(
    (acc, cur) => {
      civilStatusFields.forEach(field => {
        acc[field] += cur[field] || 0;
      });
      return acc;
    },
    { single: 0, married: 0, widower: 0, separated: 0, divorced: 0, notReported: 0 }
  );

  const chartData = [
    { category: "Single", count: totals.single },
    { category: "Married", count: totals.married },
    { category: "Widower", count: totals.widower },
    { category: "Separated", count: totals.separated },
    { category: "Divorced", count: totals.divorced },
    { category: "Not Reported", count: totals.notReported },
  ];

  // Styles
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <h1 style={{ 
        fontSize: '30px', 
        fontWeight: 'bold',
        color: '#1f2937', 
        margin: 0 
      }}>
        Civil Status of Filipino Emigrants
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

      {/* Bar Chart Card */}
      <div style={cardStyle}>
        <h3 style={h3Style}>Total Emigrants by Civil Status</h3>
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
          <BarChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
            <XAxis dataKey="category" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => value.toLocaleString()} />
            <Tooltip 
              formatter={(value) => [value.toLocaleString(), 'Count']}
              cursor={{ fill: 'rgba(239, 246, 255, 0.7)' }}
              contentStyle={{ borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb' }}
            />
            <Legend wrapperStyle={{ fontSize: '14px', paddingTop: '10px' }} />
            <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
          </BarChart>
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
                style={{ display: 'none' }}
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
            gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", 
            gap: "12px", 
            marginBottom: "16px" 
          }}>
            {allFormFields.map((key) => (
              <input
                key={key}
                name={key}
                type="number"
                placeholder={key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}
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
              <table style={{ borderCollapse: "collapse", width: "100%", minWidth: '800px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f9fafb' }}>
                    <TableCell isHeader>Year</TableCell>
                    <TableCell isHeader>Single</TableCell>
                    <TableCell isHeader>Married</TableCell>
                    <TableCell isHeader>Widower</TableCell>
                    <TableCell isHeader>Separated</TableCell>
                    <TableCell isHeader>Divorced</TableCell>
                    <TableCell isHeader>Not Reported</TableCell>
                    <TableCell isHeader style={{ textAlign: 'right', minWidth: '120px' }}>Actions</TableCell>
                  </tr>
                </thead>
                <tbody>
                  {emigrants.map((e) => (
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
                                style={{ ...inputStyle, padding: '4px 8px', fontSize: '14px', width: '80px' }}
                                min="0"
                              />
                            </TableCell>
                          ))}
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
                          <TableCell>{(e.single || 0).toLocaleString()}</TableCell>
                          <TableCell>{(e.married || 0).toLocaleString()}</TableCell>
                          <TableCell>{(e.widower || 0).toLocaleString()}</TableCell>
                          <TableCell>{(e.separated || 0).toLocaleString()}</TableCell>
                          <TableCell>{(e.divorced || 0).toLocaleString()}</TableCell>
                          <TableCell>{(e.notReported || 0).toLocaleString()}</TableCell>
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
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default BarChartPage;