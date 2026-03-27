import React, { useState, useMemo, useEffect } from 'react';
import { Printer, FileSpreadsheet, CalendarDays, CalendarRange, Users, Database, RefreshCw, AlertCircle, CheckCircle2, Download, User } from 'lucide-react';
import Papa from 'papaparse';
import html2pdf from 'html2pdf.js';

// --- MOCK DATA FALLBACK ---
const tasksList = [
  'BIT/RONDAAN', 'PEJABAT PERTANYAAN', 'RCJ', 'SENTRI / PROWLER', 'SJR',
  'TUGAS PENTADBIRAN', 'JAGA AMAN / OP SEPADU', 'MESYUARAT / PERJUMPAAN',
  'TUGAS TRAFIK', 'PERHIMPUNAN', 'LDP / KURSUS', 'BILIK KAWALAN (DCC)', 'RCJ (MPV)'
];

const ranksList = ['ASP', 'INSP', 'SI', 'SM', 'SJN', 'KPL', 'L/KPL', 'KONSTABEL'];

const mockDailyData = [
  { id: 1, days: [7, null, 15, null, null, 8, 7, 8, 8, 15, 15, 7, null, 15, 23, 16, 8, 12, 16, 24, 8, 8, 8, null, null, null, null, null, null, null, null] },
  { id: 2, days: [8, 8, null, 8, 4, 4, 4, 4, 8, 8, null, 4, 9, 5, null, 11, 5, null, 8, 24, 11, 16, 8, null, null, 5, null, null, null, null, null] },
  { id: 3, days: Array(31).fill(null) },
  { id: 4, days: [...Array(16).fill(null), 12, ...Array(14).fill(null)] },
  { id: 5, days: Array(31).fill(null) },
  { id: 6, days: [null, null, null, null, null, 6, 8, null, 8, 8, 6, 6, null, null, null, null, 6, null, null, 18, 6, null, 5, 8, 12, 8, 8, 8, null, null, null] },
  ...Array.from({ length: 7 }, (_, i) => ({ id: i + 7, days: Array(31).fill(null) }))
];

const mockWeeklyData = [
  { id: 1, weeks: [22, 105, 98, 68, 0] },
  { id: 2, weeks: [36, 42, 70, 37, 0] },
  { id: 3, weeks: [0, 0, 0, 0, 0] },
  { id: 4, weeks: [0, 0, 12, 0, 0] },
  { id: 5, weeks: [0, 0, 0, 0, 0] },
  { id: 6, weeks: [18, 36, 24, 77, 18] },
  ...Array.from({ length: 7 }, (_, i) => ({ id: i + 7, weeks: [0, 0, 0, 0, 0] }))
];

const mockRankData = [
  { id: 1, ranks: [null, null, null, null, null, 121, 148, 24] },
  { id: 2, ranks: [null, null, null, null, null, 117, 68, null] },
  { id: 3, ranks: [null, null, null, null, null, null, null, null] },
  { id: 4, ranks: [null, null, null, null, null, 8, 4, null] },
  { id: 5, ranks: [null, null, null, null, null, null, null, null] },
  { id: 6, ranks: [24, 36, null, null, null, 77, 36, null] },
  ...Array.from({ length: 7 }, (_, i) => ({ id: i + 7, ranks: Array(8).fill(null) }))
];

const months = [
  'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
  'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
];

const districts = ['ALOR GAJAH', 'MELAKA TENGAH', 'JASIN', 'IPK SSPDRM'];
const years = [2024, 2025, 2026, 2027, 2028];

// ==========================================
// CONFIGURATION
// ==========================================
// PASTE YOUR GOOGLE SHEET ID HERE
// Example: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
const GOOGLE_SHEET_ID: string = "1mD8nfxGetTY1Xi4o4d471eCFOCDmbEJ_ZclBguqsnMI";

type TabType = 'DAILY' | 'WEEKLY' | 'RANK' | 'PERSONAL';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState('');
  const [userTab, setUserTab] = useState('');
  const [userDistrict, setUserDistrict] = useState('');
  const [loggedInName, setLoggedInName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [activeTab, setActiveTab] = useState<TabType>('DAILY');
  const [selectedMonth, setSelectedMonth] = useState('JANUARY');
  const [selectedYear, setSelectedYear] = useState(2026);
  const [selectedDistrict, setSelectedDistrict] = useState('ALOR GAJAH');
  const [selectedPerson, setSelectedPerson] = useState('ALL');

  const [printMode, setPrintMode] = useState<'CURRENT' | 'ALL'>('CURRENT');
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  
  // Google Sheets State
  const [rawData, setRawData] = useState<any[]>([]);
  const [csvFields, setCsvFields] = useState<string[]>([]);
  const [rawCsvText, setRawCsvText] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Load saved auth on mount
  useEffect(() => {
    const savedAuth = localStorage.getItem('pdrm_auth');
    const savedRole = localStorage.getItem('pdrm_user_role');
    const savedName = localStorage.getItem('pdrm_user_name');
    const savedTab = localStorage.getItem('pdrm_user_tab');
    const savedDistrict = localStorage.getItem('pdrm_user_district');
    if (savedAuth === 'true') {
      setIsAuthenticated(true);
      if (savedRole) setUserRole(savedRole);
      if (savedName) setLoggedInName(savedName);
      if (savedTab) setUserTab(savedTab);
      if (savedDistrict) {
        setUserDistrict(savedDistrict);
        if (savedRole && savedRole.toLowerCase() !== 'admin') {
          setSelectedDistrict(savedDistrict);
        }
      }
      
      if (savedRole && savedRole.toLowerCase() !== 'admin') {
        const tabStr = (savedTab || '').toUpperCase();
        let initialTab: TabType = 'PERSONAL';
        
        if (tabStr.includes('T1') || tabStr.includes('WEEKLY')) initialTab = 'WEEKLY';
        else if (tabStr.includes('T2') || tabStr.includes('DAILY')) initialTab = 'DAILY';
        else if (tabStr.includes('T3') || tabStr.includes('RANK')) initialTab = 'RANK';
        else if (tabStr.includes('T4') || tabStr.includes('PERSONAL')) initialTab = 'PERSONAL';
        else if (!tabStr) initialTab = 'PERSONAL';
        
        setActiveTab(initialTab);
        if (savedName) setSelectedPerson(savedName);
      }
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!GOOGLE_SHEET_ID || GOOGLE_SHEET_ID === "YOUR_GOOGLE_SHEET_ID_HERE") {
      setLoginError('Please set your GOOGLE_SHEET_ID in the code.');
      return;
    }

    if (!username || !password) {
      setLoginError('Please enter both username and password.');
      return;
    }

    setIsLoggingIn(true);
    setLoginError('');

    try {
      const response = await fetch(`https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/gviz/tq?tqx=out:csv&sheet=users`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch users data. Ensure the sheet is public and has a tab named "users".');
      }
      
      const csvText = await response.text();
      
      if (csvText.trim().toLowerCase().startsWith('<!doctype html>') || csvText.trim().toLowerCase().startsWith('<html')) {
         throw new Error('Received an HTML login page instead of data. Please ensure the Google Sheet sharing setting is set to "Anyone with the link".');
      }

      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const users = results.data as any[];
          const user = users.find(u => {
            const uName = (u.Username || u.username || u.USERNAME || '').toString().trim();
            const uPass = (u.password || u.Password || u.PASSWORD || '').toString().trim();
            return uName.toLowerCase() === username.trim().toLowerCase() && uPass === password.trim();
          });
          
          if (user) {
            setIsAuthenticated(true);
            
            const getVal = (obj: any, targetKeys: string[]) => {
              const normalizedTargets = targetKeys.map(k => k.toLowerCase().replace(/[^a-z0-9]/g, ''));
              for (const key in obj) {
                const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
                if (normalizedTargets.includes(normalizedKey)) {
                  return obj[key];
                }
              }
              return '';
            };

            const role = getVal(user, ['Role', 'Peranan']).toString().trim();
            const name = getVal(user, ['Name', 'Nama', 'Username']).toString().trim().toUpperCase();
            const defaultTab = getVal(user, ['Tab', 'TabAccess', 'Capaian', 'Tab Access']).toString().trim().toUpperCase();
            const district = getVal(user, ['District', 'Daerah', 'Distric']).toString().trim().toUpperCase();
            
            setUserRole(role);
            setLoggedInName(name);
            setUserTab(defaultTab);
            setUserDistrict(district);
            
            localStorage.setItem('pdrm_auth', 'true');
            localStorage.setItem('pdrm_user_role', role);
            localStorage.setItem('pdrm_user_name', name);
            localStorage.setItem('pdrm_user_tab', defaultTab);
            localStorage.setItem('pdrm_user_district', district);
            
            if (role.toLowerCase() !== 'admin') {
              if (district) setSelectedDistrict(district);
              
              const normalizedTab = defaultTab.toUpperCase();
              let initialTab: TabType = 'PERSONAL';
              
              if (normalizedTab.includes('T1') || normalizedTab.includes('WEEKLY')) initialTab = 'WEEKLY';
              else if (normalizedTab.includes('T2') || normalizedTab.includes('DAILY')) initialTab = 'DAILY';
              else if (normalizedTab.includes('T3') || normalizedTab.includes('RANK')) initialTab = 'RANK';
              else if (normalizedTab.includes('T4') || normalizedTab.includes('PERSONAL')) initialTab = 'PERSONAL';
              else if (!normalizedTab) initialTab = 'PERSONAL';
              
              setActiveTab(initialTab);
              if (name) setSelectedPerson(name);
            } else {
              setActiveTab('DAILY');
              setSelectedPerson('ALL');
            }
            
            setLoginError('');
          } else {
            setLoginError('Invalid username or password');
            console.log("Parsed users:", users);
          }
          setIsLoggingIn(false);
        },
        error: (err: any) => {
          setLoginError('Error parsing users data.');
          setIsLoggingIn(false);
        }
      });
    } catch (err: any) {
      setLoginError(err.message || 'Error connecting to Google Sheets');
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUserRole('');
    setLoggedInName('');
    setUserTab('');
    setUserDistrict('');
    localStorage.removeItem('pdrm_auth');
    localStorage.removeItem('pdrm_user_role');
    localStorage.removeItem('pdrm_user_name');
    localStorage.removeItem('pdrm_user_tab');
    localStorage.removeItem('pdrm_user_district');
  };

  // Fetch data when year changes
  useEffect(() => {
    if (isAuthenticated && GOOGLE_SHEET_ID && GOOGLE_SHEET_ID !== "YOUR_GOOGLE_SHEET_ID_HERE") {
      fetchSheetData(GOOGLE_SHEET_ID, selectedYear);
    }
  }, [isAuthenticated, selectedYear]);

  const fetchSheetData = async (id: string, year: number) => {
    if (!id) return;
    setIsLoading(true);
    setError('');
    try {
      // Fetch specific sheet tab based on the selected year
      const response = await fetch(`https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&sheet=${year}`);
      
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error('Access Denied. Please ensure the Google Sheet sharing setting is set to "Anyone with the link".');
        }
        throw new Error(`Failed to fetch data. Ensure the sheet is public and has a tab named "${year}".`);
      }
      
      const csvText = await response.text();
      setRawCsvText(csvText);

      // If the response is HTML, it means Google redirected to a login page
      if (csvText.trim().toLowerCase().startsWith('<!doctype html>') || csvText.trim().toLowerCase().startsWith('<html')) {
         throw new Error('Received an HTML login page instead of data. Please ensure the Google Sheet sharing setting is set to "Anyone with the link".');
      }
      
      Papa.parse(csvText, {
        header: false,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.errors.length > 0 && results.data.length === 0) {
            setError('Error parsing CSV data. Check your sheet format.');
          } else {
            setRawData(results.data);
            setCsvFields([]);
            setLastUpdated(new Date());
          }
          setIsLoading(false);
        },
        error: (err: any) => {
          setError(err.message);
          setIsLoading(false);
        }
      });
    } catch (err: any) {
      setError(err.message || 'Failed to connect to Google Sheets');
      setIsLoading(false);
    }
  };

  const [showDebug, setShowDebug] = useState(false);

  // --- DATA PROCESSING ---
  const processedData = useMemo(() => {
    if (!GOOGLE_SHEET_ID || GOOGLE_SHEET_ID === "YOUR_GOOGLE_SHEET_ID_HERE") {
      // Fallback to mock data only if no sheet is connected
      return { daily: mockDailyData, weekly: mockWeeklyData, rank: mockRankData, personal: [], debugLogs: [] };
    }

    // Initialize empty structures
    const daily = tasksList.map((task, i) => ({ id: i + 1, name: task, days: Array(31).fill(null) }));
    const weekly = tasksList.map((task, i) => ({ id: i + 1, name: task, weeks: Array(5).fill(0) }));
    const rank = tasksList.map((task, i) => ({ id: i + 1, name: task, ranks: Array(8).fill(null) }));
    const personalMap = new Map<string, any>();
    const debugLogs: any[] = [];

    if (!rawData || rawData.length === 0) {
      return { daily, weekly, rank, personal: [], debugLogs };
    }

    const normalizeStr = (s: string) => (s || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

    // Find header row
    let headerRowIndex = -1;
    let colIndices = {
      date: -1,
      district: -1,
      task: -1,
      hours: -1,
      rank: -1,
      colT: -1
    };

    for (let i = 0; i < Math.min(20, rawData.length); i++) {
      const row = rawData[i];
      if (!Array.isArray(row)) continue;
      
      console.log("Row " + i + ":", row);
      
      const dateIdx = row.findIndex(c => String(c).toUpperCase().includes('TARIKH'));
      const districtIdx = row.findIndex(c => String(c).toUpperCase().includes('DAERAH'));
      
      if (dateIdx !== -1 && districtIdx !== -1) {
        headerRowIndex = i;
        colIndices.date = dateIdx;
        colIndices.district = districtIdx;
        
        colIndices.task = row.findIndex(c => String(c).toUpperCase().includes('JENIS TUGASAN'));
        colIndices.hours = row.findIndex(c => String(c).toUpperCase().includes('JUMLAH JAM'));
        
        // Fallback if not found dynamically (assuming they are after the 4 pairs of Balai/Name)
        if (colIndices.task === -1) colIndices.task = 10;
        if (colIndices.hours === -1) colIndices.hours = 11;

        colIndices.rank = row.findIndex(c => String(c).toUpperCase().includes('PANGKAT'));
        colIndices.colT = row.findIndex(c => String(c).toUpperCase().includes('NYATAKAN') || String(c).toUpperCase().includes('LAIN-LAIN TUGAS') && !String(c).toUpperCase().includes('JENIS'));
        break;
      }
    }

    if (headerRowIndex === -1) {
      debugLogs.push({ reason: 'Could not find header row with TARIKH and DAERAH' });
      return { daily, weekly, rank, personal: [], debugLogs };
    }

    // Process data rows
    for (let i = headerRowIndex + 1; i < rawData.length; i++) {
      const row = rawData[i];
      if (!Array.isArray(row)) continue;

      const dateStr = colIndices.date !== -1 ? row[colIndices.date] : null;
      const districtStr = colIndices.district !== -1 ? row[colIndices.district] : null;
      const rankStr = colIndices.rank !== -1 ? row[colIndices.rank] : null;

      let rowMonth = -1, rowYear = -1, rowDay = -1;
      
      if (dateStr) {
        // Extract date part (ignore time)
        const dateOnly = String(dateStr).split(' ')[0];
        const parts = dateOnly.split(/[\/\-]/);
        
        if (parts.length === 3) {
          if (parts[0].length === 4) {
            // YYYY-MM-DD
            rowYear = parseInt(parts[0], 10);
            rowMonth = parseInt(parts[1], 10) - 1;
            rowDay = parseInt(parts[2], 10);
          } else {
            // DD/MM/YYYY or MM/DD/YYYY
            const p0 = parseInt(parts[0], 10);
            const p1 = parseInt(parts[1], 10);
            const p2 = parseInt(parts[2], 10);
            
            if (p1 > 12) {
              rowMonth = p0 - 1;
              rowDay = p1;
              rowYear = p2;
            } else {
              rowDay = p0;
              rowMonth = p1 - 1;
              rowYear = p2;
            }
            if (rowYear < 100) rowYear += 2000;
          }
        } else {
          const d = new Date(dateStr);
          if (!isNaN(d.getTime())) {
            rowYear = d.getFullYear();
            rowMonth = d.getMonth();
            rowDay = d.getDate();
          }
        }
      }

      const isYearMatch = rowYear !== -1 && rowYear === selectedYear;
      const isDistrictMatch = districtStr && String(districtStr).trim().toUpperCase().includes(selectedDistrict.toUpperCase());

      if (!isYearMatch || !isDistrictMatch) {
        continue;
      }

      let taskStr = colIndices.task !== -1 && colIndices.task < row.length ? row[colIndices.task] : null;
      let hoursStr = colIndices.hours !== -1 && colIndices.hours < row.length ? row[colIndices.hours] : null;

      const totalHours = parseFloat(String(hoursStr)) || 0;

      // Extract person names (multiple people can be in one row)
      const nameIndices = [3, 5, 7, 9];
      nameIndices.forEach(idx => {
        if (idx < row.length && row[idx] && String(row[idx]).trim() !== '') {
          const personName = String(row[idx]).trim().toUpperCase();
          
          if (!personalMap.has(personName)) {
            personalMap.set(personName, {
              name: personName,
              rank: String(rankStr || '').toUpperCase().trim(),
              months: Array(12).fill(0),
              total: 0
            });
          }
          
          const pData = personalMap.get(personName)!;
          if (rowMonth >= 0 && rowMonth < 12) {
            pData.months[rowMonth] += totalHours;
            pData.total += totalHours;
          }
        }
      });

      const isMonthMatch = rowMonth !== -1 && months[rowMonth] === selectedMonth;
      if (!isMonthMatch) {
        continue;
      }

      if (!taskStr || !hoursStr || String(taskStr).trim() === '' || String(hoursStr).trim() === '') {
        continue;
      }

      // If task is LAIN-LAIN TUGAS, check Column T for the specific task name
      if (normalizeStr(String(taskStr)) === normalizeStr('LAIN-LAIN TUGAS') && colIndices.colT !== -1 && row.length > colIndices.colT) {
        const colTValue = String(row[colIndices.colT]).trim();
        if (colTValue) {
          // Check if colTValue matches any of our known tasks
          const matchedTask = tasksList.find(t => normalizeStr(t) === normalizeStr(colTValue));
          if (matchedTask) {
            taskStr = matchedTask;
          } else {
            // Some specific mappings based on common entries
            const normalizedColT = normalizeStr(colTValue);
            if (normalizedColT.includes('trafik') || normalizedColT.includes('traffik')) taskStr = 'TUGAS TRAFIK';
            else if (normalizedColT.includes('lalulintas')) taskStr = 'KAWALAN LALULINTAS';
            else if (normalizedColT.includes('mahkamah')) taskStr = 'TUGASAN MAHKAMAH';
            else if (normalizedColT.includes('khas')) taskStr = 'TUGASAN KHAS';
            else if (normalizedColT.includes('mesyuarat')) taskStr = 'MESYUARAT';
            else if (normalizedColT.includes('jagaaman')) taskStr = 'JAGA AMAN';
            else if (normalizedColT.includes('operasi')) taskStr = 'OPERASI';
          }
        }
      }

      const taskIndex = tasksList.findIndex(t => normalizeStr(t) === normalizeStr(String(taskStr)));
      
      if (taskIndex === -1) {
        continue;
      }

      // Daily
      if (rowDay >= 1 && rowDay <= 31) {
        daily[taskIndex].days[rowDay - 1] = (daily[taskIndex].days[rowDay - 1] || 0) + totalHours;
      }

      // Weekly
      const weekIndex = Math.min(Math.floor((rowDay - 1) / 7), 4);
      weekly[taskIndex].weeks[weekIndex] += totalHours;

      // Rank
      if (rankStr) {
        const rawRank = String(rankStr).toUpperCase().replace(/\/SP$/, '').trim();
        let rankIndex = ranksList.findIndex(r => r === rawRank);
        
        if (rankIndex === -1) {
          if (rawRank === 'KONST') {
            rankIndex = ranksList.indexOf('KONSTABEL');
          } else {
            // Fallback fuzzy match
            rankIndex = ranksList.findIndex(r => normalizeStr(r) === normalizeStr(String(rankStr)));
          }
        }
        
        if (rankIndex !== -1) {
          rank[taskIndex].ranks[rankIndex] = (rank[taskIndex].ranks[rankIndex] || 0) + totalHours;
        }
      }
    }

    const personal = Array.from(personalMap.values()).sort((a, b) => a.name.localeCompare(b.name));
    return { daily, weekly, rank, personal, debugLogs };
  }, [rawData, csvFields, selectedMonth, selectedYear, selectedDistrict]);

  // --- CALCULATIONS ---
  const dailyWithTotals = useMemo(() => {
    return processedData.daily.map((row, index) => {
      const total = row.days.reduce((sum, val) => (sum || 0) + (val || 0), 0);
      return { ...row, name: tasksList[index], total: total === 0 ? null : total };
    });
  }, [processedData.daily]);

  const dailyColumnTotals = useMemo(() => {
    const totals = Array(31).fill(0);
    let grandTotal = 0;
    dailyWithTotals.forEach(row => {
      row.days.forEach((val, idx) => {
        if (val) {
          totals[idx] += val;
          grandTotal += val;
        }
      });
    });
    return { days: totals.map(t => t === 0 ? null : t), grandTotal };
  }, [dailyWithTotals]);

  const weeklyWithTotals = useMemo(() => {
    return processedData.weekly.map((row, index) => {
      const total = row.weeks.reduce((sum, val) => sum + val, 0);
      return { ...row, name: tasksList[index], total };
    });
  }, [processedData.weekly]);

  const weeklyColumnTotals = useMemo(() => {
    const totals = Array(5).fill(0);
    let grandTotal = 0;
    weeklyWithTotals.forEach(row => {
      row.weeks.forEach((val, idx) => {
        totals[idx] += val;
        grandTotal += val;
      });
    });
    return { weeks: totals, grandTotal };
  }, [weeklyWithTotals]);

  const rankWithTotals = useMemo(() => {
    return processedData.rank.map((row, index) => {
      const total = row.ranks.reduce((sum, val) => (sum || 0) + (val || 0), 0);
      return { ...row, name: tasksList[index], total: total === 0 ? null : total };
    });
  }, [processedData.rank]);

  const rankColumnTotals = useMemo(() => {
    const totals = Array(8).fill(0);
    let grandTotal = 0;
    rankWithTotals.forEach(row => {
      row.ranks.forEach((val, idx) => {
        if (val) {
          totals[idx] += val;
          grandTotal += val;
        }
      });
    });
    return { ranks: totals.map(t => t === 0 ? null : t), grandTotal };
  }, [rankWithTotals]);

  const handlePrint = () => {
    try {
      const result = window.print();
      if (result === undefined) {
        if (window.self !== window.top) {
           setShowPrintModal(true);
        }
      }
    } catch (e) {
      console.error("Print failed:", e);
      setShowPrintModal(true);
    }
  };

  const handlePrintAll = () => {
    setPrintMode('ALL');
    setTimeout(() => {
      try {
        const result = window.print();
        if (result === undefined) {
          if (window.self !== window.top) {
             setShowPrintModal(true);
          }
        }
      } catch (e) {
        console.error("Print failed:", e);
        setShowPrintModal(true);
      }
      setTimeout(() => setPrintMode('CURRENT'), 1000);
    }, 100);
  };

  const handleSavePDF = () => {
    if (isGeneratingPDF) return;
    
    setIsGeneratingPDF(true);
    setPrintMode('ALL');
    
    // Give time for the UI to update to 'ALL' mode and for styles to apply
    setTimeout(() => {
      window.scrollTo(0, 0); // Important for html2canvas
      const element = document.getElementById('report-container');
      if (!element) {
        setIsGeneratingPDF(false);
        setPrintMode('CURRENT');
        alert("Report container not found. Please try again.");
        return;
      }
      
      const opt = {
        margin:       [10, 10, 10, 10] as [number, number, number, number],
        filename:     `SSPDRM_Report_${selectedMonth}_${selectedYear}.pdf`,
        image:        { type: 'jpeg' as const, quality: 0.98 },
        html2canvas:  { scale: 2, windowWidth: 1400 },
        jsPDF:        { unit: 'pt' as const, format: [800, 500] as [number, number], orientation: 'landscape' as const },
        pagebreak:    { mode: 'css' }
      };

      try {
        html2pdf().set(opt).from(element).save().then(() => {
          setIsGeneratingPDF(false);
          setPrintMode('CURRENT');
        }).catch((err: any) => {
          console.error("PDF generation failed:", err);
          try {
            const result = window.print();
            if (result === undefined && window.self !== window.top) {
              setShowPrintModal(true);
            }
          } catch (e) {
            setShowPrintModal(true);
          }
          setIsGeneratingPDF(false);
          setPrintMode('CURRENT');
        });
      } catch (err) {
        console.error("html2pdf initialization failed:", err);
        try {
          const result = window.print();
          if (result === undefined && window.self !== window.top) {
            setShowPrintModal(true);
          }
        } catch (e) {
          setShowPrintModal(true);
        }
        setIsGeneratingPDF(false);
        setPrintMode('CURRENT');
      }
    }, 1500);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
          <div className="flex justify-center mb-6">
            <div className="bg-blue-900 p-4 rounded-full">
              <Users className="w-12 h-12 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-center text-gray-800 mb-6">SSPDRM Report System</h1>
          
          {(!GOOGLE_SHEET_ID || GOOGLE_SHEET_ID === "YOUR_GOOGLE_SHEET_ID_HERE") ? (
            <div className="text-center">
              <p className="text-red-600 font-medium mb-4">
                Please configure your GOOGLE_SHEET_ID in the code to continue.
              </p>
            </div>
          ) : (
            <form onSubmit={handleLogin}>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="username">
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  placeholder="Enter username"
                  disabled={isLoggingIn}
                />
              </div>
              <div className="mb-6">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  placeholder="Enter password"
                  disabled={isLoggingIn}
                />
                {loginError && <p className="text-red-500 text-xs italic mt-2">{loginError}</p>}
              </div>
              <div className="flex flex-col gap-3">
                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="bg-blue-900 hover:bg-blue-800 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full flex justify-center items-center gap-2 disabled:opacity-50"
                >
                  {isLoggingIn ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                  {isLoggingIn ? 'Signing In...' : 'Sign In'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  }

  // --- RENDERERS ---
  const renderDailyTable = () => (
    <table className="w-full border-collapse border border-black text-xs sm:text-sm text-center font-medium print:break-inside-avoid">
      <thead>
        <tr>
          <th className="border border-black p-1 sm:p-2 w-8" rowSpan={2}>Bil</th>
          <th className="border border-black p-1 sm:p-2 text-left min-w-[200px]" rowSpan={2}>PENUGASAN</th>
          <th className="border border-black p-1 sm:p-2" colSpan={31}>DALAM BULAN TERSEBUT</th>
          <th className="border border-black p-1 sm:p-2 w-16 text-[10px] leading-tight" rowSpan={2}>
            JUMLAH<br/>JAM
          </th>
        </tr>
        <tr>
          {Array.from({ length: 31 }, (_, i) => (
            <th key={i + 1} className="border border-black p-1 w-6 sm:w-8 font-bold">
              {i + 1}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {dailyWithTotals.map((row) => (
          <tr key={row.id} className="even:bg-gray-50/50 print:even:bg-transparent">
            <td className="border border-black p-1 font-bold">{row.id}</td>
            <td className="border border-black p-1 text-left font-bold pl-2">{row.name}</td>
            {row.days.map((val, idx) => (
              <td key={idx} className="border border-black p-1 font-bold">
                {val || ''}
              </td>
            ))}
            <td className="border border-black p-1 font-bold bg-gray-50 print:bg-transparent">
              {row.total || ''}
            </td>
          </tr>
        ))}
        <tr className="bg-gray-50 print:bg-transparent">
          <td className="border border-black p-1" colSpan={2}></td>
          {dailyColumnTotals.days.map((val, idx) => (
            <td key={idx} className="border border-black p-1 font-bold text-gray-600 print:text-black">
              {val || ''}
            </td>
          ))}
          <td className="border border-black p-1 font-bold text-blue-600 print:text-black">
            {dailyColumnTotals.grandTotal}
          </td>
        </tr>
      </tbody>
    </table>
  );

  const renderWeeklyTable = () => (
    <table className="w-full border-collapse border border-black text-xs sm:text-sm text-center font-medium mt-4 print:break-inside-avoid">
      <thead>
        <tr>
          <th className="border border-black p-2 w-12" rowSpan={2}>BIL</th>
          <th className="border border-black p-2 text-left w-48 min-w-[150px]" rowSpan={2}>PROGRAM / AKTIVITI</th>
          <th className="border border-black p-2" colSpan={5}>DALAM BULAN TERSEBUT</th>
          <th className="border border-black p-2 w-32" rowSpan={2}>JUMLAH JAM<br/>KESELURUHAN</th>
        </tr>
        <tr>
          <th className="border border-black p-2 w-24">MINGGU<br/>PERTAMA</th>
          <th className="border border-black p-2 w-24">MINGGU<br/>KEDUA</th>
          <th className="border border-black p-2 w-24">MINGGU<br/>KETIGA</th>
          <th className="border border-black p-2 w-24">MINGGU<br/>KEEMPAT</th>
          <th className="border border-black p-2 w-24">MINGGU<br/>KELIMA</th>
        </tr>
      </thead>
      <tbody>
        {weeklyWithTotals.map((row) => (
          <tr key={row.id} className="even:bg-gray-50/50 print:even:bg-transparent">
            <td className="border border-black p-2">{row.id}</td>
            <td className="border border-black p-2 text-left pl-2">{row.name}</td>
            {row.weeks.map((val, idx) => (
              <td key={idx} className="border border-black p-2">
                {val}
              </td>
            ))}
            <td className="border border-black p-2 bg-gray-50 print:bg-transparent">
              {row.total}
            </td>
          </tr>
        ))}
        <tr className="bg-gray-50 print:bg-transparent">
          <td className="border border-black p-2" colSpan={2}></td>
          {weeklyColumnTotals.weeks.map((val, idx) => (
            <td key={idx} className="border border-black p-2 font-bold text-gray-600 print:text-black">
              {val === 0 ? '' : val}
            </td>
          ))}
          <td className="border border-black p-2 font-bold text-blue-600 print:text-black">
            {weeklyColumnTotals.grandTotal}
          </td>
        </tr>
      </tbody>
    </table>
  );

  const renderRankTable = () => (
    <table className="w-full border-collapse border border-black text-xs sm:text-sm text-center font-medium print:break-inside-avoid">
      <thead>
        <tr>
          <th className="border border-black p-2 w-48 bg-white" colSpan={2}>DAERAH</th>
          <th className="border border-black p-2 bg-[#00b0f0] text-black font-bold" colSpan={9}>
            PENUGASAN PEGAWAI DAN ANGGOTA SSPDRM DAERAH {selectedDistrict} BAGI BULAN
          </th>
        </tr>
        <tr>
          <th className="border border-black p-2 bg-[#ffff00] text-black font-bold text-lg" colSpan={2}>
            {selectedDistrict}
          </th>
          <th className="border border-black p-2 bg-[#d9d9d9] text-black text-lg font-bold" colSpan={9}>
            {selectedMonth} {selectedYear}
          </th>
        </tr>
        <tr className="bg-white">
          <th className="border border-black p-2 w-12" rowSpan={2}>BIL</th>
          <th className="border border-black p-2 text-left w-48 min-w-[150px]" rowSpan={2}>JENIS TUGAS</th>
          <th className="border border-black p-1 w-16">ASP/SP</th>
          <th className="border border-black p-1 w-16">INSP/SP</th>
          <th className="border border-black p-1 w-16">SI/SP</th>
          <th className="border border-black p-1 w-16">SM/SP</th>
          <th className="border border-black p-1 w-16">SJN/SP</th>
          <th className="border border-black p-1 w-16">KPL/SP</th>
          <th className="border border-black p-1 w-16">L/KPL/SP</th>
          <th className="border border-black p-1 w-20">KONST/SP</th>
          <th className="border border-black p-2 w-24 font-bold" rowSpan={2}>JUMLAH</th>
        </tr>
        <tr className="bg-white">
          <th className="border border-black p-1">ASP</th>
          <th className="border border-black p-1">INSP</th>
          <th className="border border-black p-1">SI</th>
          <th className="border border-black p-1">SM</th>
          <th className="border border-black p-1">SJN</th>
          <th className="border border-black p-1">KPL</th>
          <th className="border border-black p-1">L/KPL</th>
          <th className="border border-black p-1">KONSTABEL</th>
        </tr>
      </thead>
      <tbody>
        {rankWithTotals.map((row) => (
          <tr key={row.id} className="even:bg-gray-50/50 print:even:bg-transparent">
            <td className="border border-black p-1">{row.id}</td>
            <td className="border border-black p-1 text-left pl-2">{row.name}</td>
            {row.ranks.map((val, idx) => (
              <td key={idx} className="border border-black p-1">
                {val || ''}
              </td>
            ))}
            <td className="border border-black p-1 bg-gray-50 print:bg-transparent">
              {row.total || ''}
            </td>
          </tr>
        ))}
        <tr className="bg-gray-50 print:bg-transparent">
          <td className="border border-black p-1" colSpan={2}></td>
          {rankColumnTotals.ranks.map((val, idx) => (
            <td key={idx} className="border border-black p-1 font-bold text-gray-600 print:text-black">
              {val || ''}
            </td>
          ))}
          <td className="border border-black p-1 font-bold text-blue-600 print:text-black">
            {rankColumnTotals.grandTotal}
          </td>
        </tr>
      </tbody>
    </table>
  );

  const renderPersonalTable = () => {
    const monthNames = ['JAN', 'FEB', 'MAC', 'APR', 'MEI', 'JUN', 'JUL', 'OGOS', 'SEPT', 'OKT', 'NOV', 'DIS'];
    
    let displayedPersonnel = processedData.personal;
    
    if (selectedPerson !== 'ALL') {
      displayedPersonnel = processedData.personal.filter(p => p.name === selectedPerson);
      
      // If no exact match and it's the logged in user, try relaxed match (for initial login state)
      if (displayedPersonnel.length === 0 && selectedPerson === loggedInName) {
        displayedPersonnel = processedData.personal.filter(p => 
          p.name.includes(loggedInName) || loggedInName.includes(p.name)
        );
      }
    } else if (userRole.toLowerCase() !== 'admin' && !userTab.toUpperCase().includes('ADMIN')) {
      // If not admin and 'ALL' is selected, we might still want to default to themselves 
      // UNLESS they explicitly chose 'ALL' and we want to allow it.
      // The user said "the data for 'semua anggota' is not showing", so we allow it.
      // No extra filtering here means it shows everyone in processedData.personal (which is district-filtered).
    }

    const monthTotals = Array(12).fill(0);
    let grandTotal = 0;
    displayedPersonnel.forEach(p => {
      p.months.forEach((m: number, i: number) => {
        monthTotals[i] += m;
        grandTotal += m;
      });
    });

    return (
      <div className="w-full">
        {(userRole.toLowerCase() !== 'admin' || selectedPerson !== 'ALL') && displayedPersonnel.length > 0 && (
          <div className="flex justify-between text-sm sm:text-base font-bold mb-6 text-left border-b border-black pb-4">
            <div>
              <div className="flex mb-2">
                <div className="w-32">NAMA</div>
                <div>: <span className="ml-2 font-normal">{displayedPersonnel[0].name}</span></div>
              </div>
              <div className="flex">
                <div className="w-32">PANGKAT / NO</div>
                <div>: <span className="ml-2 font-normal">{displayedPersonnel[0].rank}</span></div>
              </div>
            </div>
            <div>
              <div className="flex">
                <div className="w-48">NO. KAD PENGENALAN</div>
                <div>: <span className="ml-2 font-normal"></span></div>
              </div>
            </div>
          </div>
        )}

        {displayedPersonnel.length === 0 && (userRole.toLowerCase() !== 'admin' || selectedPerson !== 'ALL') && (
          <div className="p-8 text-center text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-300 mb-6">
            Tiada data tugasan dijumpai untuk {userRole.toLowerCase() !== 'admin' ? 'anda' : 'anggota ini'} pada tahun {selectedYear} di daerah {selectedDistrict}.
          </div>
        )}
        
        <table className="w-full border-collapse border border-black text-xs sm:text-sm text-center font-medium print:break-inside-avoid">
          <thead>
            <tr className="bg-gray-100 print:bg-transparent">
              <th className="border border-black p-2 w-10">BIL</th>
              <th className="border border-black p-2 text-left min-w-[200px]">NAMA</th>
              <th className="border border-black p-2 w-32">NO. PANGKAT</th>
              {monthNames.map(m => (
                <th key={m} className="border border-black p-1 w-12">{m}</th>
              ))}
              <th className="border border-black p-2 w-20">JUMLAH<br/>JAM</th>
            </tr>
          </thead>
          <tbody>
            {displayedPersonnel.map((person, idx) => (
              <tr key={idx} className="even:bg-gray-50/50 print:even:bg-transparent">
                <td className="border border-black p-1">{idx + 1}</td>
                <td className="border border-black p-1 text-left pl-2">{person.name}</td>
                <td className="border border-black p-1">{person.rank}</td>
                {person.months.map((hours: number, i: number) => (
                  <td key={i} className="border border-black p-1">{hours || 0}</td>
                ))}
                <td className="border border-black p-1 font-bold bg-gray-50 print:bg-transparent">{person.total}</td>
              </tr>
            ))}
            {displayedPersonnel.length === 0 && (
              <tr>
                <td colSpan={16} className="border border-black p-4 text-gray-500">Tiada rekod anggota dijumpai untuk tahun {selectedYear}</td>
              </tr>
            )}
            {displayedPersonnel.length > 0 && (
              <tr className="bg-gray-50 print:bg-transparent font-bold">
                <td className="border border-black p-2 text-right pr-4" colSpan={3}>JUMLAH KESELURUHAN</td>
                {monthTotals.map((total, i) => (
                  <td key={i} className="border border-black p-1 text-blue-600 print:text-black">{total || 0}</td>
                ))}
                <td className="border border-black p-1 text-blue-600 print:text-black">{grandTotal}</td>
              </tr>
            )}
          </tbody>
        </table>
        
        {/* Signature Area */}
        <div className="mt-16 text-left text-sm font-bold print:block">
          <div className="mb-16">Disahkan oleh</div>
          <div className="border-b border-black w-64 mb-2"></div>
          <div>(Nama & Jawatan)</div>
          <div>Tarikh</div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-8 print:p-0 print:bg-white">
      {/* Controls - Hidden when printing */}
      <div className="max-w-7xl mx-auto mb-6 bg-white p-6 rounded-xl shadow-sm border border-gray-200 print:hidden">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FileSpreadsheet className="w-6 h-6 text-blue-600" />
              SSPDRM Dashboard
            </h1>
            <div className="flex items-center gap-3 mt-2">
              <p className="text-sm text-gray-500">
                Select parameters and view type to generate the report.
              </p>
              {(GOOGLE_SHEET_ID && GOOGLE_SHEET_ID !== "YOUR_GOOGLE_SHEET_ID_HERE") ? (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                  <CheckCircle2 className="w-3 h-3" /> Connected to Sheets
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-medium">
                  <AlertCircle className="w-3 h-3" /> Using Mock Data
                </span>
              )}
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <select 
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              disabled={userRole.toLowerCase() !== 'admin'}
              className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:opacity-75 disabled:bg-gray-100"
            >
              {userRole.toLowerCase() === 'admin' ? (
                districts.map(d => <option key={d} value={d}>{d}</option>)
              ) : (
                <option value={userDistrict}>{userDistrict}</option>
              )}
            </select>
            
            <select 
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              {months.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            
            <select 
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>

            {activeTab === 'PERSONAL' && (
              <select 
                value={selectedPerson}
                onChange={(e) => setSelectedPerson(e.target.value)}
                className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none max-w-[200px] truncate"
              >
                <option value="ALL">SEMUA ANGGOTA</option>
                {processedData.personal.map(p => (
                  <option key={p.name} value={p.name}>{p.name}</option>
                ))}
              </select>
            )}

            {(GOOGLE_SHEET_ID && GOOGLE_SHEET_ID !== "YOUR_GOOGLE_SHEET_ID_HERE") && (
              <button 
                onClick={() => fetchSheetData(GOOGLE_SHEET_ID, selectedYear)}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg text-sm font-medium transition-colors shadow-sm disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            )}
            
            <button 
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 hover:bg-red-100 text-red-600 rounded-lg text-sm font-medium transition-colors shadow-sm"
            >
              Logout
            </button>

            <div className="flex flex-col items-end gap-1">
              <div className="flex gap-2">
                <button 
                  onClick={handlePrintAll}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
                >
                  <Printer className="w-4 h-4" />
                  Print All
                </button>
                <button 
                  onClick={handleSavePDF}
                  disabled={isGeneratingPDF}
                  className={`flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm ${isGeneratingPDF ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isGeneratingPDF ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  {isGeneratingPDF ? 'Generating...' : 'Save All to PDF'}
                </button>
              </div>
              <span className="text-[10px] text-gray-500 print:hidden">
                *Open app in a new tab to print
              </span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mt-6 border-b border-gray-200 pb-px">
          {(userRole.toLowerCase() === 'admin' || userTab.toUpperCase().includes('T1') || userTab.toUpperCase().includes('WEEKLY') || !userTab || userTab.trim() === '') && (
            <button
              onClick={() => setActiveTab('WEEKLY')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                activeTab === 'WEEKLY' 
                  ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-700' 
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <CalendarRange className="w-4 h-4" />
              Mingguan (Weekly)
            </button>
          )}
          {(userRole.toLowerCase() === 'admin' || userTab.toUpperCase().includes('T2') || userTab.toUpperCase().includes('DAILY') || !userTab || userTab.trim() === '') && (
            <button
              onClick={() => setActiveTab('DAILY')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                activeTab === 'DAILY' 
                  ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-700' 
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <CalendarDays className="w-4 h-4" />
              Bulanan (Monthly)
            </button>
          )}
          {(userRole.toLowerCase() === 'admin' || userTab.toUpperCase().includes('T3') || userTab.toUpperCase().includes('RANK') || !userTab || userTab.trim() === '') && (
            <button
              onClick={() => setActiveTab('RANK')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                activeTab === 'RANK' 
                  ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-700' 
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Users className="w-4 h-4" />
              Pangkat (Rank)
            </button>
          )}
          {(userRole.toLowerCase() === 'admin' || userTab.toUpperCase().includes('T4') || userTab.toUpperCase().includes('PERSONAL') || !userTab || userTab.trim() === '') && (
            <button
              onClick={() => setActiveTab('PERSONAL')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                activeTab === 'PERSONAL' 
                  ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-700' 
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <User className="w-4 h-4" />
              Tahunan (Yearly)
            </button>
          )}
        </div>
      </div>

      {/* Printable Report Area */}
      {(!GOOGLE_SHEET_ID || GOOGLE_SHEET_ID === "YOUR_GOOGLE_SHEET_ID_HERE") && (
        <div className="max-w-7xl mx-auto mb-6 bg-amber-50 border border-amber-200 rounded-xl p-6 text-center print:hidden shadow-sm">
          <Database className="w-10 h-10 text-amber-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-amber-900 mb-2">Currently showing sample data</h2>
          <p className="text-amber-700 mb-4 max-w-2xl mx-auto">
            Please configure your GOOGLE_SHEET_ID in the code to view and manage your actual SSPDRM volunteer data.
          </p>
        </div>
      )}

      <div id="report-container" className={`max-w-[1400px] mx-auto bg-white print:max-w-none print:shadow-none shadow-lg border-4 border-blue-600 print:border-blue-600 p-4 sm:p-8 overflow-x-auto ${printMode === 'ALL' ? 'pdf-mode' : ''}`}>
        
        {/* Data Tables */}
        <div className="w-full overflow-x-auto">
          {(printMode === 'ALL' || activeTab === 'DAILY') && (
            <div className={`print-page-container ${printMode === 'ALL' ? 'html2pdf__page-break' : ''}`}>
              <div className="text-center mb-6">
                <h2 className="text-xl sm:text-2xl font-bold uppercase tracking-wide text-gray-900">
                  SUKARELAWAN POLIS DIRAJA MALAYSIA KONTINJEN MELAKA
                </h2>
                <div className="text-sm sm:text-base font-semibold mt-1 uppercase">
                  BAHAGIAN PENTADBIRAN <span className="ml-2">{selectedDistrict}</span>
                </div>
                <div className="text-sm sm:text-base font-semibold mt-1">
                  PROGRAM / AKTIVITI PASUKAN {printMode === 'ALL' ? '(HARIAN)' : ''}
                </div>
                <div className="text-sm sm:text-base font-semibold mt-1 uppercase">
                  BULAN : <span className="ml-2">{selectedMonth}</span> <span className="ml-4">{selectedYear}</span>
                </div>
              </div>
              {renderDailyTable()}
            </div>
          )}

          {(printMode === 'ALL' || activeTab === 'WEEKLY') && (
            <div className={`print-page-container ${printMode === 'ALL' ? 'html2pdf__page-break' : ''}`}>
              <div className="text-center mb-6">
                <h2 className="text-xl sm:text-2xl font-bold uppercase tracking-wide text-gray-900">
                  SUKARELAWAN POLIS DIRAJA MALAYSIA KONTINJEN MELAKA
                </h2>
                <div className="text-sm sm:text-base font-semibold mt-1 uppercase">
                  BAHAGIAN PENTADBIRAN <span className="ml-2">{selectedDistrict}</span>
                </div>
                <div className="text-sm sm:text-base font-semibold mt-1">
                  PROGRAM / AKTIVITI PASUKAN {printMode === 'ALL' ? '(MINGGUAN)' : ''}
                </div>
                <div className="text-sm sm:text-base font-semibold mt-1 uppercase">
                  BULAN : <span className="ml-2">{selectedMonth}</span> <span className="ml-4">{selectedYear}</span>
                </div>
              </div>
              {renderWeeklyTable()}
            </div>
          )}

          {(printMode === 'ALL' || activeTab === 'RANK') && (
            <div className={`print-page-container ${printMode === 'ALL' ? 'html2pdf__page-break' : ''}`}>
              {printMode === 'ALL' && (
                <div className="text-center mb-6">
                  <h2 className="text-xl sm:text-2xl font-bold uppercase tracking-wide text-gray-900">
                    KEDUDUKAN (RANK)
                  </h2>
                </div>
              )}
              {renderRankTable()}
            </div>
          )}

          {(printMode === 'ALL' || activeTab === 'PERSONAL') && (
            <div className={`print-page-container ${printMode === 'ALL' ? 'html2pdf__page-break' : ''}`}>
              <div className="text-center mb-6">
                <h2 className="text-xl sm:text-2xl font-bold uppercase tracking-wide text-gray-900">
                  SUKARELAWAN SIMPANAN POLIS DIRAJA MALAYSIA (SSPDRM)
                </h2>
                <div className="text-sm sm:text-base font-semibold mt-1 uppercase">
                  KONTINJEN : <span className="ml-2">MELAKA</span>
                </div>
                <div className="text-sm sm:text-base font-semibold mt-1 uppercase">
                  DAERAH : <span className="ml-2">{selectedDistrict}</span>
                </div>
                <div className="text-sm sm:text-base font-semibold mt-4 uppercase">
                  JUMLAH JAM TAHUNAN BAGI TAHUN <span className="ml-2 border-b border-black pb-1 px-4">{selectedYear}</span>
                </div>
              </div>
              {renderPersonalTable()}
            </div>
          )}
        </div>
        
      </div>

      {/* Print Modal */}
      {showPrintModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 print:hidden">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Printing Unavailable Here</h3>
            <p className="text-gray-600 mb-6">
              Because this app is running inside a preview window, the browser's print function is blocked. 
              <br/><br/>
              To print or save as PDF, please click the <strong>"Open in new tab"</strong> button at the top right of your screen (the square icon with an arrow pointing out), and try printing from there.
            </p>
            <div className="flex justify-end">
              <button 
                onClick={() => setShowPrintModal(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

