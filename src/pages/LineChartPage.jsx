import React, { useEffect, useState, useMemo } from "react";
import {
  LineChart,
  Line,
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
  TrendingUp
} from "lucide-react";
import { 
getEmigrantsBySex, 
addEmigrantSex, 
updateEmigrantSex, 
deleteEmigrantSex 
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

function LineChartPage() {
  const [emigrants, setEmigrants] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [csvFileName, setCsvFileName] = useState("");
  const [message, setMessage] = useState({ text: "", type: "" });
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    year: "",
    male: "",
    female: ""
  });

  const allFormFields = ["year", "male", "female"];
  const sexFields = ["male", "female"];

  // Fetch Data
  const fetchData = async () => {
    setLoading(true);
    try {
      console.log("Starting data fetch...");
      const data = await getEmigrantsBySex();
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

  // Sort emigrants by year in ascending order
  const sortedEmigrants = useMemo(() => {
    return [...emigrants].sort((a, b) => a.year - b.year);
  }, [emigrants]);

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
        male: Number(form.male) || 0,
        female: Number(form.female) || 0,
      };

      console.log("Adding new record:", newRecord);
      await addEmigrantSex(newRecord);
      
      // Reset form
      setForm({ year: "", male: "", female: "" });
      
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
        male: Number(editForm.male) || 0,
        female: Number(editForm.female) || 0
      };

      console.log("Saving record:", id, updatedRecord);
      await updateEmigrantSex(id, updatedRecord);
      
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
      await deleteEmigrantSex(id);
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
              
              sexFields.forEach(field => {
                // Handle different CSV header naming conventions
                const value = row[field] || 
                             row[field.charAt(0).toUpperCase() + field.slice(1)] ||
                             0;
                record[field] = Number(value) || 0;
              });
              
              return record;
            });

          console.log("Processed records:", records);

          // Add records to database
          for (const record of records) {
            await addEmigrantSex(record);
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

  // Calculate totals for display
  const totals = useMemo(() => {
    return sortedEmigrants.reduce(
      (acc, cur) => {
        acc.male += cur.male || 0;
        acc.female += cur.female || 0;
        acc.total += (cur.male || 0) + (cur.female || 0);
        return acc;
      },
      { male: 0, female: 0, total: 0 }
    );
  }, [sortedEmigrants]);

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
        Filipino Emigrants by Sex
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
          <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Total Male</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#3b82f6' }}>
            {totals.male.toLocaleString()}
          </div>
        </div>
        <div style={statCardStyle}>
          <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Total Female</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>
            {totals.female.toLocaleString()}
          </div>
        </div>
        <div style={statCardStyle}>
          <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Total Emigrants</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#8b5cf6' }}>
            {totals.total.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Line Chart Card */}
      <div style={cardStyle}>
        <h3 style={h3Style}><TrendingUp size={20} /> Emigration Trends by Sex</h3>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart
            data={sortedEmigrants}
            margin={{ top: 5, right: 20, left: -10, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
            <XAxis 
              dataKey="year" 
              fontSize={12} 
              tickLine={false} 
              axisLine={false} 
            />
            <YAxis 
              fontSize={12} 
              tickLine={false} 
              axisLine={false} 
              tickFormatter={(value) => value.toLocaleString()} 
            />
            <Tooltip 
              formatter={(value) => [value.toLocaleString(), 'Count']}
              cursor={{ stroke: '#8b5cf6', strokeDasharray: '3 3' }}
              contentStyle={{ borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb' }}
            />
            <Legend wrapperStyle={{ fontSize: '14px', paddingTop: '10px' }} />
            <Line
              type="monotone"
              dataKey="male"
              name="Male"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ r: 4, fill: '#3b82f6' }}
              activeDot={{ r: 6, stroke: 'white', strokeWidth: 2 }}
            />
            <Line
              type="monotone"
              dataKey="female"
              name="Female"
              stroke="#10b981"
              strokeWidth={2}
              dot={{ r: 4, fill: '#10b981' }}
              activeDot={{ r: 6, stroke: 'white', strokeWidth: 2 }}
            />
          </LineChart>
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
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", 
            gap: "12px", 
            marginBottom: "16px" 
          }}>
            {allFormFields.map((key) => (
              <input
                key={key}
                name={key}
                type="number"
                placeholder={key.charAt(0).toUpperCase() + key.slice(1)}
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
          <h4 style={h3Style}>Current Records ({sortedEmigrants.length})</h4>
          {sortedEmigrants.length === 0 ? (
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
              <table style={{ borderCollapse: "collapse", width: "100%", minWidth: '600px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f9fafb' }}>
                    <TableCell isHeader>Year</TableCell>
                    <TableCell isHeader>Male</TableCell>
                    <TableCell isHeader>Female</TableCell>
                    <TableCell isHeader>Total</TableCell>
                    <TableCell isHeader style={{ textAlign: 'right', minWidth: '120px' }}>Actions</TableCell>
                  </tr>
                </thead>
                <tbody>
                  {sortedEmigrants.map((e) => {
                    const total = (e.male || 0) + (e.female || 0);
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
                                  style={{ ...inputStyle, padding: '4px 8px', fontSize: '14px', width: '100px' }}
                                  min="0"
                                />
                              </TableCell>
                            ))}
                            <TableCell>
                              {((Number(editForm.male) || 0) + (Number(editForm.female) || 0)).toLocaleString()}
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
                            <TableCell>{(e.male || 0).toLocaleString()}</TableCell>
                            <TableCell>{(e.female || 0).toLocaleString()}</TableCell>
                            <TableCell>{total.toLocaleString()}</TableCell>
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

export default LineChartPage;