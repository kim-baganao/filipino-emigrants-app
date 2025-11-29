import React, { useState, useEffect, useMemo } from 'react';
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from 'react-simple-maps';
import { scaleQuantile } from 'd3-scale';
import Papa from 'papaparse';
import {
  Upload,
  Database,
  Plus,
  Save,
  X,
  Trash2,
  Edit,
  FileInput,
  Map,
  BarChart2,
  List
} from "lucide-react";
import { 
  addEmigrantCountry, 
  getEmigrantsByCountry, 
  updateEmigrantCountry, 
  deleteEmigrantCountry 
} from '../services/emigrantsService';

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

// Use a different geoURL that's more reliable
const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

const FlowMapPage = () => {
  const [data, setData] = useState([]);
  const [selectedYear, setSelectedYear] = useState("All");
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [csvFileName, setCsvFileName] = useState("");
  const [message, setMessage] = useState({ text: "", type: "" });
  const [loading, setLoading] = useState(false);

  const countries = [
    "USA", "CANADA", "JAPAN", "AUSTRALIA", "ITALY",
    "NEW ZEALAND", "UNITED KINGDOM", "GERMANY", "SOUTH KOREA",
    "SPAIN", "OTHERS"
  ];
  
  const allFormFields = ["year", ...countries];

  const [form, setForm] = useState({
    year: "",
    "USA": "",
    "CANADA": "",
    "JAPAN": "",
    "AUSTRALIA": "",
    "ITALY": "",
    "NEW ZEALAND": "",
    "UNITED KINGDOM": "",
    "GERMANY": "",
    "SOUTH KOREA": "",
    "SPAIN": "",
    "OTHERS": ""
  });

  // Country to ISO code mapping
  const countryToISO = {
    "USA": "USA",
    "CANADA": "CAN",
    "JAPAN": "JPN",
    "AUSTRALIA": "AUS",
    "ITALY": "ITA",
    "NEW ZEALAND": "NZL",
    "UNITED KINGDOM": "GBR",
    "GERMANY": "DEU",
    "SOUTH KOREA": "KOR",
    "SPAIN": "ESP"
  };

  // Coordinates for major destination countries
  const countryCoordinates = {
    "USA": [-95.7129, 37.0902],
    "CANADA": [-106.3468, 56.1304],
    "JAPAN": [138.2529, 36.2048],
    "AUSTRALIA": [133.7751, -25.2744],
    "ITALY": [12.5674, 41.8719],
    "NEW ZEALAND": [174.8860, -40.9006],
    "UNITED KINGDOM": [-3.4360, 55.3781],
    "GERMANY": [10.4515, 51.1657],
    "SOUTH KOREA": [127.7669, 35.9078],
    "SPAIN": [-3.7492, 40.4637]
  };

  const [mapData, setMapData] = useState([]);
  const [colorScale, setColorScale] = useState(() => () => "#cccccc");
  const [position, setPosition] = useState({ coordinates: [0, 20], zoom: 1.5 });

  function handleMoveEnd(position) {
    setPosition(position);
  }

  const showMessage = (text, type = "success") => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: "", type: "" }), 3000);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      console.log("Starting data fetch...");
      const fetchedData = await getEmigrantsByCountry();
      console.log("Data fetched:", fetchedData);
      setData(fetchedData);
    } catch (error) {
      console.error("Error fetching data:", error);
      showMessage("❌ Error fetching data.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Calculate data when data or selectedYear changes
  useEffect(() => {
    if (data.length === 0) return;

    // Calculate totals for each country
    const filteredRecords = selectedYear === "All"
      ? data
      : data.filter((r) => Number(r.year) === Number(selectedYear));

    const countryTotals = {};
    countries.forEach(country => {
      countryTotals[country] = filteredRecords.reduce((sum, item) => sum + (item[country] || 0), 0);
    });

    // Prepare map data
    const newMapData = [];
    countries.forEach(country => {
      if (country !== "OTHERS" && countryToISO[country]) {
        newMapData.push({
          id: countryToISO[country],
          name: country,
          value: countryTotals[country] || 0,
          coordinates: countryCoordinates[country]
        });
      }
    });

    setMapData(newMapData);

    // Create color scale
    const values = newMapData.map(d => d.value).filter(val => val > 0);
    if (values.length > 0) {
      const newColorScale = scaleQuantile()
        .domain(values)
        .range([
          "#ffedea", "#ffcec5", "#ffad9f", "#ff8a75", "#ff5533",
          "#e2492d", "#be3d26", "#9a311f", "#782618"
        ]);
      setColorScale(() => newColorScale);
    }
  }, [data, selectedYear]);

  // Calculate totals for display
  const totals = useMemo(() => {
    const totalByCountry = {};
    countries.forEach(country => {
      totalByCountry[country] = data.reduce((sum, record) => sum + (record[country] || 0), 0);
    });
    const grandTotal = Object.values(totalByCountry).reduce((sum, value) => sum + value, 0);
    return { ...totalByCountry, total: grandTotal };
  }, [data]);

  // Available years
  const years = useMemo(() => {
    const ys = Array.from(new Set(data.map((r) => r.year).filter(Boolean))).map(Number);
    ys.sort((a, b) => a - b);
    return ys;
  }, [data]);

  // Calculate total emigrants for selected year
  const totalEmigrants = useMemo(() => {
    const filteredRecords = selectedYear === "All"
      ? data
      : data.filter((r) => Number(r.year) === Number(selectedYear));

    let total = 0;
    countries.forEach(country => {
      total += filteredRecords.reduce((sum, item) => sum + (item[country] || 0), 0);
    });
    return total;
  }, [data, selectedYear]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleEditChange = (e) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };
  
  // Helper to create record object from a form
  const getRecordFromForm = (sourceForm) => {
    const record = { year: Number(sourceForm.year) };
    countries.forEach(country => {
      record[country] = Number(sourceForm[country]) || 0;
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
      await addEmigrantCountry(newRecord);
      
      // Reset form
      const resetForm = { year: "" };
      countries.forEach(country => { resetForm[country] = ""; });
      setForm(resetForm);
      
      await fetchData();
      showMessage("✅ Record added successfully!", "success");
    } catch (error) {
      console.error("Error adding record:", error);
      showMessage("❌ Error adding record.", "error");
    }
  };

  // Start editing a record
  const handleEdit = (item) => {
    setEditingId(item.id);
    const editData = { year: String(item.year || "") };
    countries.forEach(country => {
      editData[country] = String(item[country] || "");
    });
    setEditForm(editData);
  };

  // Save updated record
  const handleSave = async (id) => {
    try {
      const updatedRecord = getRecordFromForm(editForm);
      console.log("Saving record:", id, updatedRecord);
      await updateEmigrantCountry(id, updatedRecord);
      setEditingId(null);
      setEditForm({});
      await fetchData();
      showMessage("✅ Record updated successfully!", "success");
    } catch (error) {
      console.error("Error updating record:", error);
      showMessage("❌ Error updating record.", "error");
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
      await deleteEmigrantCountry(id);
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
            .filter(row => row.year || row.Year || row.YEAR) // Filter valid rows
            .map((row) => {
              const record = { year: Number(row.year || row.Year || row.YEAR) || 0 };
              
              countries.forEach(country => {
                // Handle different CSV header naming conventions
                const value = row[country] || 
                             row[country.toLowerCase()] ||
                             row[country.replace(/\s+/g, ' ').toLowerCase()] ||
                             0;
                record[country] = Number(value) || 0;
              });
              
              return record;
            });

          console.log("Processed records:", recordsToAdd);

          // Add records to database
          for (const record of recordsToAdd) {
            await addEmigrantCountry(record);
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

  const selectStyle = {
    padding: '8px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    backgroundColor: 'white',
    fontSize: '14px'
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <h1 style={{ 
        fontSize: '30px', 
        fontWeight: 'bold',
        color: '#1f2937', 
        margin: 0 
      }}>
        Filipino Emigrants Bubble Map
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
          <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Total to USA</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#3b82f6' }}>
            {totals.USA.toLocaleString()}
          </div>
        </div>
        <div style={statCardStyle}>
          <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Total to Canada</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>
            {totals.CANADA.toLocaleString()}
          </div>
        </div>
        <div style={statCardStyle}>
          <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Total to Japan</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#8b5cf6' }}>
            {totals.JAPAN.toLocaleString()}
          </div>
        </div>
        <div style={statCardStyle}>
          <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Total Emigrants</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>
            {totals.total.toLocaleString()}
          </div>
        </div>
      </div>
      
      {/* Map Card */}
      <div style={cardStyle}>
        <h3 style={h3Style}>
          <Map size={20} /> Emigrants Distribution by Destination Country
        </h3>
        
        <div style={{ margin: '16px 0 24px 0', display: 'flex', alignItems: 'center', gap: 12 }}>
          <label style={{ fontSize: 14, fontWeight: '500', color: '#4b5563' }}>Filter by Year:</label>
          <select 
            value={selectedYear} 
            onChange={(e) => setSelectedYear(e.target.value)} 
            style={selectStyle}
          >
            <option value="All">All Years (Totals)</option>
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        <div style={{ 
          height: '600px', 
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          overflow: 'hidden',
          backgroundColor: '#f9fafb'
        }}>
          <ComposableMap
            projection="geoMercator"
            projectionConfig={{ scale: 180, center: [0, 30], rotate: [-10, 0, 0] }}
            style={{ width: '100%', height: '100%' }}
          >
            <ZoomableGroup
              zoom={1.8}
              center={[0, 30]}
              onMoveEnd={handleMoveEnd}
            >
              <Geographies geography={geoUrl}>
                {({ geographies }) =>
                  geographies.map((geo) => {
                    const countryData = mapData.find(
                      (d) => d.id === geo.properties.iso_a3
                    );
                    return (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        fill={countryData ? colorScale(countryData.value) : "#F5F5F5"}
                        stroke="#D6D6DA"
                        strokeWidth={0.8}
                        style={{
                          default: { outline: 'none', cursor: 'pointer' },
                          hover: { 
                            fill: countryData ? '#F53' : '#DDD', 
                            outline: 'none', 
                            stroke: '#000', 
                            strokeWidth: 1.5 
                          },
                          pressed: { outline: 'none', fill: countryData ? '#C00' : '#BBB' }
                        }}
                      />
                    );
                  })
                }
              </Geographies>
              
              {mapData.map(({ id, name, value, coordinates }) => (
                value > 0 && (
                  <Marker key={id} coordinates={coordinates}>
                    <circle
                      r={Math.min(Math.max(Math.sqrt(value) / 80, 5), 25)}
                      fill="#FF5533"
                      stroke="#FFF"
                      strokeWidth={2}
                      opacity={0.9}
                    />
                    <text
                      textAnchor="middle"
                      y={-Math.min(Math.max(Math.sqrt(value) / 80, 5), 25) - 8}
                      style={{
                        fontFamily: 'system-ui', fill: '#2D3748',
                        fontSize: '11px', fontWeight: 'bold'
                      }}
                    >
                      {name}
                    </text>
                    <text
                      textAnchor="middle"
                      y={-Math.min(Math.max(Math.sqrt(value) / 80, 5), 25) + 15}
                      style={{
                        fontFamily: 'system-ui', fill: '#2D3748',
                        fontSize: '9px', fontWeight: '600'
                      }}
                    >
                      {value.toLocaleString()}
                    </text>
                  </Marker>
                )
              ))}
            </ZoomableGroup>
          </ComposableMap>
        </div>

        <div style={{ 
          textAlign: 'center', 
          marginTop: '20px',
          padding: '10px',
          backgroundColor: '#f8f9fa',
          borderRadius: '6px',
          fontSize: '14px',
          color: '#666'
        }}>
          <strong>Tip:</strong> You can zoom and pan the map for better viewing
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
            gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", 
            gap: "12px", 
            marginBottom: "16px" 
          }}>
            {allFormFields.map((key) => (
              <input
                key={key}
                name={key}
                type="number"
                placeholder={key}
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
          <h4 style={h3Style}>Current Records ({data.length})</h4>
          {data.length === 0 ? (
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
                    {countries.map(country => (
                      <TableCell isHeader key={country}>{country}</TableCell>
                    ))}
                    <TableCell isHeader>Total</TableCell>
                    <TableCell isHeader style={{ textAlign: 'right', minWidth: '120px' }}>Actions</TableCell>
                  </tr>
                </thead>
                <tbody>
                  {data.map((item) => {
                    const rowTotal = countries.reduce((sum, country) => sum + (item[country] || 0), 0);
                    return (
                      <tr key={item.id}
                        style={{ transition: 'background-color 0.2s' }}
                        onMouseEnter={(event) => event.currentTarget.style.backgroundColor = '#f9fafb'}
                        onMouseLeave={(event) => event.currentTarget.style.backgroundColor = 'white'}
                      >
                        {editingId === item.id ? (
                          // Edit mode
                          <>
                            <TableCell>
                              <input
                                name="year"
                                type="number"
                                value={editForm.year}
                                onChange={handleEditChange}
                                style={{ ...inputStyle, padding: '4px 8px', fontSize: '14px', width: '90px' }}
                                min="0"
                              />
                            </TableCell>
                            {countries.map(country => (
                              <TableCell key={country}>
                                <input
                                  name={country}
                                  type="number"
                                  value={editForm[country]}
                                  onChange={handleEditChange}
                                  style={{ ...inputStyle, padding: '4px 8px', fontSize: '14px', width: '90px' }}
                                  min="0"
                                />
                              </TableCell>
                            ))}
                            <TableCell>
                              {countries.reduce((sum, country) => sum + (Number(editForm[country]) || 0), 0).toLocaleString()}
                            </TableCell>
                            <TableCell style={{ textAlign: 'right' }}>
                              <IconButton
                                icon={Save}
                                onClick={() => handleSave(item.id)}
                                color="#10b981"
                                hoverColor="#059669"
                                label="Save"
                              />
                              <IconButton
                                icon={X}
                                onClick={handleCancel}
                                label="Cancel"
                              />
                            </TableCell>
                          </>
                        ) : (
                          // View mode
                          <>
                            <TableCell>{item.year || 0}</TableCell>
                            {countries.map(country => (
                              <TableCell key={country}>{(item[country] || 0).toLocaleString()}</TableCell>
                            ))}
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

      {/* Country Summary Table Card */}
      <div style={cardStyle}>
        <h3 style={h3Style}><List size={20} /> Country Totals ({selectedYear})</h3>
        <div style={{ overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
          <table style={{ borderCollapse: "collapse", width: "100%" }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb' }}>
                <TableCell isHeader>Country</TableCell>
                <TableCell isHeader style={{ textAlign: 'right' }}>Total Emigrants</TableCell>
                <TableCell isHeader style={{ textAlign: 'right' }}>Percentage</TableCell>
              </tr>
            </thead>
            <tbody>
              {countries.map(country => {
                const filteredRecords = selectedYear === "All"
                  ? data
                  : data.filter((r) => Number(r.year) === Number(selectedYear));
                
                const total = filteredRecords.reduce((sum, item) => sum + (item[country] || 0), 0);
                const percentage = totalEmigrants > 0 ? ((total / totalEmigrants) * 100).toFixed(1) : 0;
                
                return (
                  <tr key={country}
                    style={{ transition: 'background-color 0.2s' }}
                    onMouseEnter={(event) => event.currentTarget.style.backgroundColor = '#f9fafb'}
                    onMouseLeave={(event) => event.currentTarget.style.backgroundColor = 'white'}
                  >
                    <TableCell>{country}</TableCell>
                    <TableCell style={{ textAlign: 'right' }}>
                      {total.toLocaleString()}
                    </TableCell>
                    <TableCell style={{ textAlign: 'right' }}>
                      {percentage}%
                    </TableCell>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default FlowMapPage;