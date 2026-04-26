import React, { useState, useMemo, useEffect } from 'react';
import { Activity, AlertOctagon, Calendar, Building2, UserX, TrendingDown, ClipboardEdit, Calculator, Save, Layers, CheckCircle2, XCircle, AlertTriangle, Trash2, Edit3, Users, BarChart3, Filter } from 'lucide-react';

// --- ตัวแปรส่วนกลาง ---
const departmentsList = [
  'พิเศษ22', 'พิเศษ21', 'พิเศษ20', 'พิเศษ19', 'พิเศษ18', 'CCU', 'ICU17', 
  'กุมาร17', 'ชาย16', 'หญิง16', 'ชาย15', 'หญิง15', 'สูตินรีเวช14', 'NICU', 
  'PP', 'SNB', 'ชาย12', 'หญิง12', 'BICU', 'PICU', 'SICU', 'MICU', 'LR', 
  'OR', 'ชาย2', 'หญิง2', 'ER', 'OPD'
];

const opdErList = ['ER', 'OPD'];
const ipdList = departmentsList.filter(dept => !opdErList.includes(dept));
const severitiesList = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];

const getSeverityColor = (level) => {
  if (['A', 'B'].includes(level)) return 'bg-blue-500';
  if (['C', 'D', 'E'].includes(level)) return 'bg-amber-500';
  return 'bg-rose-500';
};

const getSeverityTextColor = (level) => {
  if (['A', 'B'].includes(level)) return 'text-blue-600';
  if (['C', 'D', 'E'].includes(level)) return 'text-amber-600';
  return 'text-rose-600';
};

const getSeverityGradient = (level) => {
  if (['A', 'B'].includes(level)) return 'from-blue-400 to-blue-600';
  if (['C', 'D', 'E'].includes(level)) return 'from-amber-400 to-orange-500';
  return 'from-rose-500 to-red-600';
};

// ==========================================
// Component: ฟอร์มกรอกข้อมูล
// ==========================================
const NurseDataEntryForm = ({ appData, onSaveData, onDeleteData }) => {
  const [formData, setFormData] = useState({
    department: '',
    recordMonth: new Date().toISOString().slice(0, 7),
    patientDays: '',
  });

  const initialSeverityCounts = severitiesList.reduce((acc, curr) => ({ ...acc, [curr]: '' }), {});
  const [severityCounts, setSeverityCounts] = useState(initialSeverityCounts);
  
  const [existingRecord, setExistingRecord] = useState(null);
  const [showSuccess, setShowSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false); // เพิ่ม State สำหรับจัดการการยืนยันลบ

  useEffect(() => {
    if (formData.department && formData.recordMonth) {
      const [yearStr, monthStr] = formData.recordMonth.split('-');
      const monthVal = parseInt(monthStr, 10).toString();
      const recordId = `${formData.department}-${yearStr}-${monthVal}`;
      
      const found = appData.find(item => item.id === recordId);
      
      if (found) {
        setExistingRecord(found);
        setFormData(prev => ({ ...prev, patientDays: found.patientDays.toString() }));
        
        const existingCounts = {};
        severitiesList.forEach(lvl => {
          existingCounts[lvl] = (found[lvl] !== undefined && found[lvl] > 0) ? found[lvl].toString() : '';
        });
        setSeverityCounts(existingCounts);
      } else {
        setExistingRecord(prev => {
          if (prev !== null) {
            setFormData(f => ({ ...f, patientDays: '' }));
            setSeverityCounts(initialSeverityCounts);
          }
          return null;
        });
      }
    }
  }, [formData.department, formData.recordMonth, appData]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSeverityChange = (level, value) => {
    setSeverityCounts(prev => ({ ...prev, [level]: value }));
  };

  const isOpdEr = opdErList.includes(formData.department);
  const denominatorLabel = isOpdEr ? "จำนวนผู้รับบริการ (Visit) ในแต่ละเดือน" : "จำนวนวันนอนในแต่ละเดือน";
  const rateLabel = isOpdEr ? "ต่อ 1,000 Visit" : "ต่อ 1,000 วันนอน";

  const totalFallCountNum = Object.values(severityCounts).reduce((sum, val) => sum + (parseInt(val, 10) || 0), 0);
  const patientDaysNum = parseFloat(formData.patientDays) || 0;
  const fallRate = patientDaysNum > 0 ? ((totalFallCountNum / patientDaysNum) * 1000).toFixed(2) : '0.00';

  const sendToGoogleSheets = async (payload) => {
    const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyTCxOcAESAK27D6hSdB3nDTiQKQRPOKeOGpAGaeDo9X3t3P6DfN3PF3oN7lTQeYRr-/exec';
    try {
      await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      });
    } catch (e) {
      console.warn("ไม่สามารถส่งเข้า Google Sheets ได้: ", e);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const [yearStr, monthStr] = formData.recordMonth.split('-');
    const month = parseInt(monthStr, 10).toString(); 
    const recordDate = new Date(yearStr, parseInt(monthStr, 10) - 1, 1).toISOString();
    const recordId = `${formData.department}-${yearStr}-${month}`;

    const newRecord = {
      id: recordId, date: recordDate, year: yearStr, month: month,
      department: formData.department, patientDays: parseInt(formData.patientDays, 10),
    };

    severitiesList.forEach(lvl => {
      newRecord[lvl] = parseInt(severityCounts[lvl], 10) || 0;
    });

    await sendToGoogleSheets({ action: 'SAVE', data: newRecord });
    onSaveData(newRecord); 
    
    setShowSuccess(existingRecord ? 'อัปเดตข้อมูลเรียบร้อยแล้ว' : 'บันทึกข้อมูลใหม่เรียบร้อยแล้ว');
    setTimeout(() => setShowSuccess(''), 3000);
    setIsSubmitting(false);

    setExistingRecord(null);
    setFormData({ department: '', recordMonth: new Date().toISOString().slice(0, 7), patientDays: '' });
    setSeverityCounts(initialSeverityCounts);
  };

  const executeDelete = async () => {
    if (!existingRecord) return;

    setIsSubmitting(true);
    setShowDeleteConfirm(false);
    
    await sendToGoogleSheets({ action: 'DELETE', id: existingRecord.id });
    onDeleteData(existingRecord.id); 
    
    setShowSuccess('ลบข้อมูลเรียบร้อยแล้ว');
    setTimeout(() => setShowSuccess(''), 3000);
    
    setExistingRecord(null);
    setFormData({ department: '', recordMonth: new Date().toISOString().slice(0, 7), patientDays: '' });
    setSeverityCounts(initialSeverityCounts);
    setIsSubmitting(false);
  };

  return (
    <div className="bg-white p-6 md:p-8 rounded-3xl shadow-xl border border-slate-100 max-w-3xl mx-auto relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-sky-400"></div>
      
      <div className="flex items-center gap-4 mb-8 pb-6 border-b border-slate-100/60">
        <div className="p-3.5 bg-blue-50 rounded-2xl shadow-inner border border-blue-100/50">
          <ClipboardEdit className="h-7 w-7 text-blue-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">บันทึกอุบัติการณ์พลัดตกหกล้ม</h2>
          <p className="text-sm text-slate-500 mt-1">บันทึกแบบ 1 แถวต่อ 1 หน่วยงานและเดือน (หากข้อมูลมีอยู่แล้ว ระบบจะดึงมาให้อัปเดต)</p>
        </div>
      </div>

      {showSuccess && (
        <div className="mb-8 p-4 bg-emerald-50 border border-emerald-200/60 text-emerald-700 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
          <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse shadow-sm shadow-emerald-200"></div>
          <span className="font-medium">{showSuccess}</span>
        </div>
      )}

      {existingRecord && !showSuccess && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200/60 rounded-2xl flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-amber-800 text-sm">พบข้อมูลในระบบแล้ว</h4>
            <p className="text-amber-700 text-sm mt-1">มีการบันทึกข้อมูลของเดือนนี้ไปแล้ว คุณสามารถ <strong>แก้ไขตัวเลขแล้วกดอัปเดต</strong> หรือ <strong>ลบข้อมูลทิ้ง</strong> ได้เลยครับ</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-7">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2.5">
            <label className="block text-sm font-semibold text-slate-700">หน่วยงาน (Department) <span className="text-rose-500">*</span></label>
            <select required name="department" value={formData.department} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 p-3 outline-none cursor-pointer transition-all">
              <option value="">-- เลือกหน่วยงาน --</option>
              {departmentsList.map(dept => <option key={dept} value={dept}>{dept}</option>)}
            </select>
          </div>

          <div className="space-y-2.5">
            <label className="block text-sm font-semibold text-slate-700">ประจำเดือนและปี <span className="text-rose-500">*</span></label>
            <input type="month" required name="recordMonth" value={formData.recordMonth} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 p-3 outline-none cursor-pointer transition-all" />
          </div>

          <div className="space-y-2.5 md:col-span-2 lg:col-span-1">
            <label className="block text-sm font-semibold text-slate-700">{denominatorLabel} <span className="text-rose-500">*</span></label>
            <input type="number" required min="1" name="patientDays" value={formData.patientDays} onChange={handleInputChange} placeholder="ระบุจำนวนรวม" className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 p-3 outline-none transition-all" />
          </div>
        </div>

        <div className="space-y-4 pt-6 border-t border-slate-100/60">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
            <label className="block text-sm font-bold text-slate-700">ระบุจำนวนครั้งแยกตามระดับความรุนแรง <span className="text-slate-400 font-normal">(เว้นว่างได้)</span></label>
            <span className="text-sm bg-white border border-blue-200 text-blue-700 py-1.5 px-4 rounded-full font-bold shadow-sm">
              รวม: {totalFallCountNum} ครั้ง
            </span>
          </div>
          
          <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-3">
            {severitiesList.map(level => (
              <div key={level} className="group relative flex flex-col rounded-xl border border-slate-300 shadow-sm overflow-hidden focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all bg-white hover:border-slate-400">
                <label className={`block text-xs font-bold text-center py-2 text-white border-b border-white/10 shadow-sm bg-gradient-to-b ${getSeverityGradient(level)}`}>
                  {level}
                </label>
                <input 
                  type="number" min="0" value={severityCounts[level]} onChange={(e) => handleSeverityChange(level, e.target.value)} 
                  placeholder="0" 
                  className="w-full text-center bg-slate-50 focus:bg-white text-slate-800 p-2.5 outline-none font-black text-xl transition-all placeholder:text-slate-300" 
                />
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 bg-blue-600 rounded-2xl p-6 text-white flex flex-col md:flex-row items-center justify-between gap-5 shadow-lg shadow-blue-900/10 border border-blue-700">
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-white/20 backdrop-blur-sm rounded-xl border border-white/20">
              <Calculator className="h-7 w-7 text-white" />
            </div>
            <div>
              <p className="text-blue-50 text-sm font-medium mb-0.5">อัตราการพลัดตกหกล้ม ({rateLabel})</p>
              <p className="text-xs text-blue-200 font-mono">Formula: (Falls / {isOpdEr ? 'Visits' : 'Patient Days'}) × 1000</p>
            </div>
          </div>
          <div className="text-4xl font-black tracking-tight text-white bg-white/10 px-4 py-2 rounded-xl">
            {fallRate}
          </div>
        </div>

        <div className="pt-4 flex flex-col sm:flex-row justify-end gap-3">
          {existingRecord && (
            showDeleteConfirm ? (
              <div className="flex items-center justify-center gap-2 bg-rose-50 p-1.5 rounded-xl border border-rose-200 animate-in fade-in">
                <span className="text-sm text-rose-700 font-bold px-3">ยืนยันการลบ?</span>
                <button type="button" onClick={executeDelete} disabled={isSubmitting} className="bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold py-2 px-4 rounded-lg transition-all shadow-sm">ใช่, ลบเลย</button>
                <button type="button" onClick={() => setShowDeleteConfirm(false)} disabled={isSubmitting} className="bg-white text-slate-600 hover:bg-slate-100 border border-slate-300 text-sm font-bold py-2 px-4 rounded-lg transition-all shadow-sm">ยกเลิก</button>
              </div>
            ) : (
              <button 
                type="button" 
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isSubmitting}
                className={`bg-white text-rose-600 border-2 border-rose-100 hover:bg-rose-50 font-semibold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2.5 ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                <Trash2 className="h-5 w-5" /> ลบข้อมูลทิ้ง
              </button>
            )
          )}

          <button 
            type="submit" 
            disabled={isSubmitting || !formData.department}
            className={`bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-xl transition-all flex items-center justify-center gap-2.5 shadow-md shadow-blue-500/20 ${isSubmitting || !formData.department ? 'opacity-70 cursor-not-allowed' : 'hover:shadow-lg hover:shadow-blue-500/30 transform hover:-translate-y-0.5 active:translate-y-0'}`}
          >
            {isSubmitting ? (
              <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : existingRecord ? (
              <Edit3 className="h-5 w-5" />
            ) : (
              <Save className="h-5 w-5" />
            )}
            {isSubmitting ? 'กำลังทำงาน...' : existingRecord ? 'อัปเดตข้อมูล' : 'บันทึกสถิติใหม่'}
          </button>
        </div>
      </form>
    </div>
  );
};

// ==========================================
// Component: กราฟเปรียบเทียบแนวโน้ม (Trend Analytics)
// ==========================================
const TrendAnalytics = ({ data, denominatorUnit }) => {
  const [compareMode, setCompareMode] = useState('monthly'); // 'monthly', 'quarterly', 'fiscal', 'yearly'
  const thaiMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

  const getGroupKey = (dObj, mode) => {
    const m = dObj.getMonth();
    const y = dObj.getFullYear();
    const thaiY = y + 543;
    const fy = m >= 9 ? thaiY + 1 : thaiY; // ปีงบประมาณเริ่ม ต.ค. (เดือน index 9)

    if (mode === 'monthly') return { key: `${y}-${String(m).padStart(2,'0')}`, label: `${thaiMonths[m]} ${String(thaiY).slice(-2)}` };
    if (mode === 'quarterly') {
        const q = m >= 9 ? 1 : m <= 2 ? 2 : m <= 5 ? 3 : 4;
        return { key: `${fy}-Q${q}`, label: `Q${q}/${String(fy).slice(-2)}` };
    }
    if (mode === 'fiscal') return { key: `${fy}`, label: `งบฯ ${fy}` };
    if (mode === 'yearly') return { key: `${y}`, label: `ปีปฏิทิน ${thaiY}` };
    return {key: '', label: ''};
  };

  const groupedData = useMemo(() => {
    const result = {};
    data.forEach(item => {
      let dObj = (item.year && item.month) ? new Date(parseInt(item.year, 10), parseInt(item.month, 10) - 1, 1) : new Date(item.date);
      const { key, label } = getGroupKey(dObj, compareMode);
      
      if (!result[key]) result[key] = { label, falls: 0, days: 0, sortKey: key };
      let itemFalls = severitiesList.reduce((sum, lvl) => sum + (item[lvl] || 0), 0);
      result[key].falls += itemFalls;
      result[key].days += (item.patientDays || 0);
    });

    return Object.values(result)
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
      .map(g => ({ ...g, rate: g.days > 0 ? (g.falls / g.days) * 1000 : 0 }))
      .slice(-12); // ดึงมาแสดงมากสุด 12 แท่งล่าสุด
  }, [data, compareMode]);

  const maxRate = Math.max(...groupedData.map(g => g.rate), 0.1);

  return (
    <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100 mt-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <h2 className="text-xl font-black text-slate-800 flex items-center gap-2.5">
          <div className="w-2 h-6 bg-blue-500 rounded-full"></div>
          กราฟเปรียบเทียบแนวโน้ม (Trend Analytics)
        </h2>
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 overflow-x-auto w-full md:w-auto">
          {[{id:'monthly', label:'รายเดือน'}, {id:'quarterly', label:'รายไตรมาส'}, {id:'fiscal', label:'ปีงบประมาณ'}, {id:'yearly', label:'ปีปฏิทิน'}].map(mode => (
            <button key={mode.id} onClick={() => setCompareMode(mode.id)} className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all ${compareMode === mode.id ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      <div className="w-full overflow-x-auto custom-scrollbar pb-4">
        <div className="min-w-[600px] flex items-end gap-2 h-64 border-b-2 border-slate-100 relative pt-6">
          {/* เส้น Guideline แนวนอน */}
          <div className="absolute top-0 left-0 w-full border-t border-dashed border-slate-200 flex items-start text-xs text-slate-400 font-medium pt-1">
             Max: {maxRate.toFixed(2)}
          </div>
          
          {groupedData.length > 0 ? groupedData.map((d, idx) => (
            <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full group">
              {/* ตัวเลขบนกราฟแท่ง */}
              <div className="opacity-0 group-hover:opacity-100 transition-opacity text-blue-600 font-bold text-sm mb-2 text-center">
                {d.rate.toFixed(2)}<br/><span className="text-[10px] text-slate-400 font-normal">({d.falls} ครั้ง)</span>
              </div>
              {/* กราฟแท่ง */}
              <div 
                className="w-4/5 max-w-[60px] bg-gradient-to-t from-blue-600 to-sky-400 rounded-t-md shadow-sm transition-all duration-700 ease-out group-hover:from-blue-700 group-hover:to-sky-500" 
                style={{ height: `${(d.rate / maxRate) * 100}%`, minHeight: d.rate > 0 ? '4px' : '0' }}
              ></div>
              {/* ป้ายชื่อแกน X */}
              <div className="mt-3 text-xs font-bold text-slate-500 text-center w-full truncate px-1">
                {d.label}
              </div>
            </div>
          )) : (
            <div className="w-full h-full flex items-center justify-center text-slate-400 font-medium">ไม่พบข้อมูลสำหรับวิเคราะห์แนวโน้ม</div>
          )}
        </div>
        <p className="text-center text-xs text-slate-400 mt-4 font-medium">แกน Y แสดงอัตราการเกิดอุบัติการณ์ (ต่อ 1,000 {denominatorUnit})</p>
      </div>
    </div>
  );
};

// ==========================================
// Component: หลัก (App)
// ==========================================
export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dashboardView, setDashboardView] = useState('IPD'); 

  // --- การตั้งค่า Default วันที่ (เป็นเดือนก่อนหน้า) ---
  const today = new Date();
  const prevMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const defStart = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}-01`;
  const defEnd = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}-${new Date(prevMonthDate.getFullYear(), prevMonthDate.getMonth() + 1, 0).getDate()}`;

  const [startDate, setStartDate] = useState(defStart);
  const [endDate, setEndDate] = useState(defEnd);
  
  // State สำหรับจัดการฟิลเตอร์แบบเป็นลำดับชั้น (Cascading)
  const [summaryType, setSummaryType] = useState('monthly');
  const [selectedYear, setSelectedYear] = useState(prevMonthDate.getFullYear() + 543);
  const [selectedSubPeriod, setSelectedSubPeriod] = useState(prevMonthDate.getMonth());

  const [isStartFocused, setIsStartFocused] = useState(false);
  const [isEndFocused, setIsEndFocused] = useState(false);

  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [appData, setAppData] = useState([]);

  const formatDisplayDate = (ymdString) => {
    if (!ymdString) return '';
    const [y, mm, d] = ymdString.split('-');
    if (!y || !mm || !d) return ymdString;
    return `${d}/${mm}/${y}`;
  };

  const thaiMonthsFull = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
  const currentCalYearThai = today.getFullYear() + 543;
  const currentFiscalYearThai = (today.getMonth() >= 9 ? today.getFullYear() + 1 : today.getFullYear()) + 543;
  
  const calYears = Array.from({length: 5}, (_, i) => currentCalYearThai - i);
  const fiscalYears = Array.from({length: 5}, (_, i) => currentFiscalYearThai - i);

  useEffect(() => {
    if (summaryType === 'custom') return;

    const engYear = selectedYear - 543;
    const setRange = (sy, sm, sd, ey, em, ed) => {
      setStartDate(`${sy}-${String(sm).padStart(2,'0')}-${String(sd).padStart(2,'0')}`);
      setEndDate(`${ey}-${String(em).padStart(2,'0')}-${String(ed).padStart(2,'0')}`);
    };

    if (summaryType === 'monthly') {
      const lastDay = new Date(engYear, selectedSubPeriod + 1, 0).getDate();
      setRange(engYear, selectedSubPeriod + 1, 1, engYear, selectedSubPeriod + 1, lastDay);
    } else if (summaryType === 'quarterly') {
      const q = selectedSubPeriod; 
      if (q === 1) setRange(engYear - 1, 10, 1, engYear - 1, 12, 31);
      if (q === 2) setRange(engYear, 1, 1, engYear, 3, 31);
      if (q === 3) setRange(engYear, 4, 1, engYear, 6, 30);
      if (q === 4) setRange(engYear, 7, 1, engYear, 9, 30);
    } else if (summaryType === 'fiscal') {
      setRange(engYear - 1, 10, 1, engYear, 9, 30);
    } else if (summaryType === 'yearly') {
      setRange(engYear, 1, 1, engYear, 12, 31);
    }
  }, [summaryType, selectedYear, selectedSubPeriod]);

  const handleSummaryTypeChange = (e) => {
    const newType = e.target.value;
    setSummaryType(newType);
    
    if (newType === 'monthly' || newType === 'yearly') {
       if (!calYears.includes(selectedYear)) setSelectedYear(currentCalYearThai);
    } else if (newType === 'quarterly' || newType === 'fiscal') {
       if (!fiscalYears.includes(selectedYear)) setSelectedYear(currentFiscalYearThai);
    }

    if (newType === 'quarterly' && (selectedSubPeriod < 1 || selectedSubPeriod > 4)) {
       setSelectedSubPeriod(1);
    } else if (newType === 'monthly' && (selectedSubPeriod < 0 || selectedSubPeriod > 11)) {
       setSelectedSubPeriod(0);
    }
  };

  useEffect(() => {
    const fetchRealData = async () => {
      try {
        const sheetId = '1c88SaT4t63lbS-7nwY-0F5MxL6twoauUyxebxtQ85no';
        const url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&t=${new Date().getTime()}`;
        const response = await fetch(url);
        if (!response.ok) return;
        const csvText = await response.text();
        
        if (csvText.trim().toLowerCase().startsWith('<!doctype html') || csvText.trim().toLowerCase().startsWith('<html')) return;

        const rows = csvText.split('\n').map(row => row.trim()).filter(row => row);
        if (rows.length < 2) return;

        const headers = rows[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
        
        const parsedData = rows.slice(1).map(row => {
          const values = row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(v => v.replace(/^"|"$/g, '').trim());
          const obj = {};
          headers.forEach((h, i) => obj[h] = values[i]);
          
          return {
            id: obj['ID (ระบบ)'], date: obj['วันที่'], year: obj['ปี'], month: obj['เดือน'], department: obj['หน่วยงาน'],
            patientDays: parseInt(obj['วันนอน(วัน)'] || 0, 10),
            A: parseInt(obj['A'] || 0, 10), B: parseInt(obj['B'] || 0, 10), C: parseInt(obj['C'] || 0, 10),
            D: parseInt(obj['D'] || 0, 10), E: parseInt(obj['E'] || 0, 10), F: parseInt(obj['F'] || 0, 10),
            G: parseInt(obj['G'] || 0, 10), H: parseInt(obj['H'] || 0, 10), I: parseInt(obj['I'] || 0, 10),
          };
        }).filter(item => item.id);

        setAppData(parsedData);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };
    fetchRealData();
  }, []);

  const handleSaveData = (record) => {
    setAppData(prevData => {
      const existsIndex = prevData.findIndex(item => item.id === record.id);
      if (existsIndex >= 0) {
        const newData = [...prevData]; newData[existsIndex] = record; return newData;
      }
      return [record, ...prevData];
    });
  };

  const handleDeleteData = (recordId) => {
    setAppData(prevData => prevData.filter(item => item.id !== recordId));
  };

  // กรองข้อมูลสำหรับแสดงสถิติด้านบน (ตามตัวกรองวันที่)
  const filteredData = useMemo(() => {
    if (!startDate || !endDate) return appData;
    const [sY, sM, sD] = startDate.split('-');
    const startTimestamp = new Date(parseInt(sY, 10), parseInt(sM, 10) - 1, parseInt(sD, 10)).getTime();
    
    const [eY, eM, eD] = endDate.split('-');
    const endObj = new Date(parseInt(eY, 10), parseInt(eM, 10) - 1, parseInt(eD, 10));
    endObj.setHours(23, 59, 59, 999);
    const endTimestamp = endObj.getTime();

    return appData.filter(item => {
      let itemTime = (item.year && item.month) ? new Date(parseInt(item.year, 10), parseInt(item.month, 10) - 1, 1).getTime() : new Date(item.date).getTime();
      const matchTime = itemTime >= startTimestamp && itemTime <= endTimestamp;
      const isOpdErItem = opdErList.includes(item.department);
      const matchView = dashboardView === 'IPD' ? !isOpdErItem : isOpdErItem;
      const matchDept = selectedDepartment === 'all' || item.department === selectedDepartment;
      
      return matchTime && matchView && matchDept;
    });
  }, [appData, startDate, endDate, dashboardView, selectedDepartment]);

  // ดึงข้อมูลสำหรับกราฟเปรียบเทียบแนวโน้ม (ไม่สนวันที่ เพื่อดูย้อนหลังทั้งหมด แต่แยกตาม IPD/OPD และแผนก)
  const trendData = useMemo(() => {
    return appData.filter(item => {
      const isOpdErItem = opdErList.includes(item.department);
      const matchView = dashboardView === 'IPD' ? !isOpdErItem : isOpdErItem;
      const matchDept = selectedDepartment === 'all' || item.department === selectedDepartment;
      return matchView && matchDept;
    });
  }, [appData, dashboardView, selectedDepartment]);

  const denominatorUnit = dashboardView === 'IPD' ? 'วันนอน' : 'Visit';
  const availableDepartments = dashboardView === 'IPD' ? ipdList : opdErList;

  const totalPatientDays = filteredData.reduce((sum, item) => sum + (item.patientDays || 0), 0);
  let totalFalls = 0, fallsAB = 0, fallsCE = 0, fallsFI = 0;
  const counts = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0, G: 0, H: 0, I: 0 };
  const deptCounts = {};

  filteredData.forEach(item => {
    let deptTotal = 0;
    severitiesList.forEach(lvl => {
      const val = item[lvl] || 0;
      counts[lvl] += val; totalFalls += val; deptTotal += val;
      if (['A', 'B'].includes(lvl)) fallsAB += val;
      if (['C', 'D', 'E'].includes(lvl)) fallsCE += val;
      if (['F', 'G', 'H', 'I'].includes(lvl)) fallsFI += val;
    });
    deptCounts[item.department] = (deptCounts[item.department] || 0) + deptTotal;
  });

  const dashboardFallRate = totalPatientDays > 0 ? ((totalFalls / totalPatientDays) * 1000).toFixed(2) : '0.00';
  const rateAB = totalPatientDays > 0 ? ((fallsAB / totalPatientDays) * 1000).toFixed(2) : '0.00';
  const rateCE = totalPatientDays > 0 ? ((fallsCE / totalPatientDays) * 1000).toFixed(2) : '0.00';
  const isPassCE = parseFloat(rateCE) <= 0.4;
  const isPassFI = fallsFI === 0;

  const deptStats = Object.entries(deptCounts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  const topDepartment = deptStats.length > 0 && deptStats[0].count > 0 ? deptStats[0].name : '-';

  const severityStats = severitiesList.map(level => ({ 
    level, count: counts[level], percentage: parseFloat(totalFalls === 0 ? 0 : ((counts[level] / totalFalls) * 100).toFixed(1)) 
  }));

  return (
    <div className="min-h-screen bg-slate-200 p-4 md:p-8 font-sans text-slate-800 pb-16">
      
      {/* แท็บเมนูหลัก */}
      <div className="bg-white/80 backdrop-blur-md p-1.5 rounded-full shadow-sm border border-slate-300 flex gap-1 max-w-fit mx-auto mb-8 z-10 relative">
        <button onClick={() => setActiveTab('dashboard')} className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all duration-300 flex items-center gap-2.5 ${activeTab === 'dashboard' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 hover:text-blue-700 hover:bg-blue-50'}`}>
          <BarChart3 className="h-4 w-4" /> แดชบอร์ดสถิติ
        </button>
        <button onClick={() => setActiveTab('form')} className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all duration-300 flex items-center gap-2.5 ${activeTab === 'form' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 hover:text-blue-700 hover:bg-blue-50'}`}>
          <ClipboardEdit className="h-4 w-4" /> บันทึกข้อมูล
        </button>
      </div>

      <div className="max-w-7xl mx-auto">
        {activeTab === 'form' ? (
          <NurseDataEntryForm appData={appData} onSaveData={handleSaveData} onDeleteData={handleDeleteData} />
        ) : (
          <div className="space-y-6 animate-in fade-in duration-500">
            
            {/* ส่วนหัวแดชบอร์ด และสลับโหมด */}
            <div className="flex flex-col bg-white p-6 rounded-3xl shadow-sm border border-slate-100 gap-5">
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div>
                  <h1 className="text-2xl font-black text-slate-800 flex items-center gap-3 tracking-tight">
                    <div className="p-2 bg-blue-600 rounded-xl text-white shadow-sm">
                      <Activity className="h-6 w-6" />
                    </div>
                    รายงานพลัดตกหกล้ม
                  </h1>
                  <p className="text-slate-500 mt-1.5 font-medium ml-1">Patient Fall Safety Dashboard</p>
                </div>
                
                {/* สลับหน้าจอ IPD กับ OPD/ER */}
                <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
                  <button 
                    onClick={() => { setDashboardView('IPD'); setSelectedDepartment('all'); }}
                    className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${dashboardView === 'IPD' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    <Building2 className="h-4 w-4" /> สถิติผู้ป่วยใน (IPD)
                  </button>
                  <button 
                    onClick={() => { setDashboardView('OPDER'); setSelectedDepartment('all'); }}
                    className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${dashboardView === 'OPDER' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    <Users className="h-4 w-4" /> สถิติ OPD / ER
                  </button>
                </div>
              </div>
              
              <div className="h-px w-full bg-slate-100"></div>

              {/* ตัวกรองวันที่อัจฉริยะ (Quick Filters) */}
              <div className="flex flex-col xl:flex-row items-center gap-4 w-full flex-wrap">
                
                <div className="flex flex-wrap items-center gap-2 bg-blue-50/50 p-2.5 rounded-2xl border border-blue-100 w-full xl:w-auto">
                  <Filter className="h-5 w-5 text-blue-600 ml-1 hidden sm:block" />
                  
                  {/* 1. เลือกการสรุปสถิติ */}
                  <select 
                    value={summaryType} onChange={handleSummaryTypeChange}
                    className="bg-white border border-blue-200 text-blue-800 text-sm font-bold rounded-lg px-3 py-2 outline-none cursor-pointer shadow-sm hover:border-blue-300"
                  >
                    <option value="monthly">รายเดือน</option>
                    <option value="quarterly">รายไตรมาส</option>
                    <option value="fiscal">รายปีงบประมาณ</option>
                    <option value="yearly">รายปีปฏิทิน</option>
                    <option value="custom">กำหนดเอง</option>
                  </select>

                  {/* 2. เลือกปี (แสดงเมื่อไม่ได้เลือก custom) */}
                  {summaryType !== 'custom' && (
                    <select 
                      value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
                      className="bg-white border border-blue-200 text-blue-800 text-sm font-bold rounded-lg px-3 py-2 outline-none cursor-pointer shadow-sm hover:border-blue-300"
                    >
                      {(summaryType === 'fiscal' || summaryType === 'quarterly' ? fiscalYears : calYears).map(y => (
                        <option key={y} value={y}>
                          {(summaryType === 'fiscal' || summaryType === 'quarterly') ? `ปีงบฯ ${y}` : `ปี พ.ศ. ${y}`}
                        </option>
                      ))}
                    </select>
                  )}

                  {/* 3. เลือกเดือน หรือ ไตรมาส */}
                  {summaryType === 'monthly' && (
                    <select 
                      value={selectedSubPeriod} onChange={(e) => setSelectedSubPeriod(parseInt(e.target.value, 10))}
                      className="bg-white border border-blue-200 text-blue-800 text-sm font-bold rounded-lg px-3 py-2 outline-none cursor-pointer shadow-sm hover:border-blue-300"
                    >
                      {thaiMonthsFull.map((m, i) => <option key={i} value={i}>{m}</option>)}
                    </select>
                  )}

                  {summaryType === 'quarterly' && (
                    <select 
                      value={selectedSubPeriod} onChange={(e) => setSelectedSubPeriod(parseInt(e.target.value, 10))}
                      className="bg-white border border-blue-200 text-blue-800 text-sm font-bold rounded-lg px-3 py-2 outline-none cursor-pointer shadow-sm hover:border-blue-300"
                    >
                      <option value={1}>ไตรมาส 1 (ต.ค. - ธ.ค.)</option>
                      <option value={2}>ไตรมาส 2 (ม.ค. - มี.ค.)</option>
                      <option value={3}>ไตรมาส 3 (เม.ย. - มิ.ย.)</option>
                      <option value={4}>ไตรมาส 4 (ก.ค. - ก.ย.)</option>
                    </select>
                  )}
                </div>

                <div className={`flex items-center justify-center gap-2 bg-slate-50 p-2.5 rounded-2xl border border-slate-200/80 w-full xl:w-auto transition-all ${summaryType === 'custom' ? 'ring-2 ring-blue-500/30 shadow-sm bg-white' : 'opacity-60'}`}>
                  <Calendar className="h-4 w-4 text-slate-400 ml-2" />
                  <input 
                    type={isStartFocused ? "date" : "text"} 
                    value={isStartFocused ? startDate : formatDisplayDate(startDate)} 
                    onChange={(e) => { setStartDate(e.target.value); setSummaryType('custom'); }} 
                    onFocus={() => setIsStartFocused(true)} onBlur={() => setIsStartFocused(false)}
                    className="bg-transparent text-slate-700 text-sm font-bold outline-none cursor-pointer w-28 text-center" 
                  />
                  <span className="text-slate-300 font-black">-</span>
                  <input 
                    type={isEndFocused ? "date" : "text"} 
                    value={isEndFocused ? endDate : formatDisplayDate(endDate)} 
                    onChange={(e) => { setEndDate(e.target.value); setSummaryType('custom'); }} 
                    onFocus={() => setIsEndFocused(true)} onBlur={() => setIsEndFocused(false)}
                    className="bg-transparent text-slate-700 text-sm font-bold outline-none cursor-pointer pr-2 w-28 text-center" 
                  />
                </div>

                <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-2xl border border-slate-200/80 w-full xl:w-auto ml-auto">
                  <Building2 className={`h-4 w-4 ml-2 ${dashboardView === 'IPD' ? 'text-blue-500' : 'text-emerald-500'}`} />
                  <select 
                    value={selectedDepartment} onChange={(e) => setSelectedDepartment(e.target.value)}
                    className="bg-transparent text-slate-700 text-sm font-bold outline-none cursor-pointer pr-4 w-full xl:w-auto appearance-none"
                    style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2394a3b8%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right .2rem top 50%', backgroundSize: '.65rem auto' }}
                  >
                    <option value="all">รวมทุกหน่วยงาน {dashboardView === 'IPD' ? '(IPD)' : '(OPD/ER)'}</option>
                    {availableDepartments.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* KPI Cards: ภาพรวม */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-5">
              <div className="bg-white p-6 rounded-3xl shadow-sm hover:shadow-md transition-all border border-slate-100 flex flex-col justify-center gap-2 relative overflow-hidden group">
                <div className="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity">
                  <UserX className="h-32 w-32 text-slate-900" />
                </div>
                <div className="flex items-center gap-3 relative z-10">
                  <div className="p-3 bg-slate-100 text-slate-600 rounded-xl"><UserX className="h-6 w-6" /></div>
                  <p className="text-sm font-bold text-slate-500">พลัดตกหกล้มรวมทั้งหมด</p>
                </div>
                <h3 className="text-4xl font-black text-slate-800 mt-2 relative z-10 tracking-tight">{totalFalls} <span className="text-base font-bold text-slate-400">ครั้ง</span></h3>
              </div>

              <div className="bg-white p-6 rounded-3xl shadow-sm hover:shadow-md transition-all border border-slate-100 flex flex-col justify-center gap-2 relative overflow-hidden group">
                <div className="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity">
                  <TrendingDown className="h-32 w-32 text-blue-900" />
                </div>
                <div className="flex items-center gap-3 relative z-10">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><TrendingDown className="h-6 w-6" /></div>
                  <p className="text-sm font-bold text-slate-500">อัตราการพลัดตกหกล้มภาพรวม</p>
                </div>
                <h3 className="text-4xl font-black text-blue-600 mt-2 relative z-10 tracking-tight">{dashboardFallRate} <span className="text-sm font-bold text-blue-300">/ 1,000 {denominatorUnit}</span></h3>
              </div>

              <div className="bg-white p-6 rounded-3xl shadow-sm hover:shadow-md transition-all border border-slate-100 flex flex-col justify-center gap-2 relative overflow-hidden group">
                <div className="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity">
                  <Building2 className="h-32 w-32 text-amber-900" />
                </div>
                <div className="flex items-center gap-3 relative z-10">
                  <div className="p-3 bg-amber-50 text-amber-600 rounded-xl"><Layers className="h-6 w-6" /></div>
                  <p className="text-sm font-bold text-slate-500">หน่วยงานเกิดสูงสุด</p>
                </div>
                <h3 className="text-xl font-black text-slate-800 mt-3 relative z-10 truncate tracking-tight">{topDepartment}</h3>
              </div>
            </div>

            {/* KPI Cards: อัตราแยกตามระดับ */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
              <div className={`bg-white p-6 rounded-3xl shadow-sm hover:shadow-md transition-all border-2 border-slate-100 hover:border-sky-200 flex flex-col justify-center gap-2 relative overflow-hidden`}>
                <div className={`absolute top-0 right-0 w-32 h-32 rounded-bl-full opacity-5 bg-sky-500`}></div>
                <div className="flex items-start justify-between relative z-10">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-sky-50 text-sky-600 rounded-xl"><Activity className="h-6 w-6" /></div>
                    <div>
                      <p className="text-sm font-bold text-slate-600">อัตราพลัดตกหกล้ม ระดับ A-B</p>
                      <p className="text-xs text-slate-400 font-medium mt-0.5">รวม: {fallsAB} ครั้ง</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-baseline gap-2 mt-3 relative z-10">
                  <h3 className="text-4xl font-black tracking-tight text-sky-600">{rateAB}</h3>
                  <span className="text-sm font-bold text-slate-400">ครั้ง / 1,000 {denominatorUnit}</span>
                </div>
              </div>

              <div className={`bg-white p-6 rounded-3xl shadow-sm hover:shadow-md transition-all border-2 ${isPassCE ? 'border-emerald-100/50 hover:border-emerald-200' : 'border-rose-200 hover:border-rose-300'} flex flex-col justify-center gap-2 relative overflow-hidden`}>
                <div className={`absolute top-0 right-0 w-32 h-32 rounded-bl-full opacity-10 ${isPassCE ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                <div className="flex items-start justify-between relative z-10">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-amber-50 text-amber-600 rounded-xl"><Activity className="h-6 w-6" /></div>
                    <div>
                      <p className="text-sm font-bold text-slate-600">อัตราพลัดตกหกล้ม ระดับ C-E</p>
                      <p className="text-xs text-slate-400 font-medium mt-0.5">เป้าหมาย: ≤ 0.4 ต่อ 1,000 {denominatorUnit}</p>
                    </div>
                  </div>
                  {isPassCE ? (
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 text-xs font-bold rounded-full border border-emerald-100"><CheckCircle2 className="h-3.5 w-3.5" /> ผ่าน</div>
                  ) : (
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-rose-600 text-xs font-bold rounded-full border border-rose-100"><XCircle className="h-3.5 w-3.5" /> ไม่ผ่าน</div>
                  )}
                </div>
                <div className="flex items-baseline gap-2 mt-3 relative z-10">
                  <h3 className={`text-4xl font-black tracking-tight ${isPassCE ? 'text-slate-800' : 'text-rose-600'}`}>{rateCE}</h3>
                  <span className="text-sm font-bold text-slate-400">ครั้ง / 1,000 {denominatorUnit}</span>
                </div>
              </div>

              <div className={`bg-white p-6 rounded-3xl shadow-sm hover:shadow-md transition-all border-2 ${isPassFI ? 'border-emerald-100/50 hover:border-emerald-200' : 'border-rose-200 hover:border-rose-300'} flex flex-col justify-center gap-2 relative overflow-hidden`}>
                <div className={`absolute top-0 right-0 w-32 h-32 rounded-bl-full opacity-10 ${isPassFI ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                <div className="flex items-start justify-between relative z-10">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-rose-50 text-rose-600 rounded-xl"><AlertOctagon className="h-6 w-6" /></div>
                    <div>
                      <p className="text-sm font-bold text-slate-600">อุบัติการณ์ ระดับ F-I</p>
                      <p className="text-xs text-slate-400 font-medium mt-0.5">เป้าหมาย: 0 ครั้ง (Zero Tolerance)</p>
                    </div>
                  </div>
                  {isPassFI ? (
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 text-xs font-bold rounded-full border border-emerald-100"><CheckCircle2 className="h-3.5 w-3.5" /> ผ่าน</div>
                  ) : (
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-rose-600 text-xs font-bold rounded-full border border-rose-100"><XCircle className="h-3.5 w-3.5" /> ไม่ผ่าน</div>
                  )}
                </div>
                <div className="flex items-baseline gap-2 mt-3 relative z-10">
                  <h3 className={`text-4xl font-black tracking-tight ${isPassFI ? 'text-slate-800' : 'text-rose-600'}`}>{fallsFI}</h3>
                  <span className="text-sm font-bold text-slate-400">ครั้ง</span>
                </div>
              </div>
            </div>

            {/* สรุปจำนวนแยกตามระดับความรุนแรง A-I */}
            <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100">
              <h2 className="text-lg font-black text-slate-800 mb-5 flex items-center gap-2.5">
                <div className="w-2 h-6 bg-blue-500 rounded-full"></div>
                อุบัติการณ์แยกตามระดับความรุนแรง (A - I)
              </h2>
              <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-3 md:gap-4">
                {severityStats.map((stat) => (
                  <div key={stat.level} className="flex flex-col items-center justify-center p-3 rounded-2xl border border-slate-300 bg-white shadow-sm hover:border-slate-400 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
                    <span className={`w-full py-2.5 flex items-center justify-center rounded-xl text-white font-black text-xl mb-3 shadow-md bg-gradient-to-br ${getSeverityGradient(stat.level)}`}>
                      {stat.level}
                    </span>
                    <span className="text-2xl font-black text-slate-800 leading-none tracking-tight mb-1">{stat.count}</span>
                    <span className="text-xs text-slate-400 font-bold">ครั้ง</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100">
                <h2 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2.5">
                  <div className="w-2 h-6 bg-blue-500 rounded-full"></div>
                  สัดส่วนร้อยละ (%)
                </h2>
                <div className="space-y-5">
                  {severityStats.map((stat) => (
                    <div key={stat.level} className="relative group">
                      <div className="flex justify-between mb-2 text-sm font-bold">
                        <span className={`w-9 h-7 flex items-center justify-center rounded-lg ${getSeverityColor(stat.level)} text-white shadow-sm`}>{stat.level}</span>
                        <span className="text-slate-500 flex items-center gap-2">
                          <span>{stat.count} ครั้ง</span>
                          <span className={`w-14 text-right font-black ${getSeverityTextColor(stat.level)}`}>{stat.percentage}%</span>
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden shadow-inner">
                        <div className={`h-full rounded-full bg-gradient-to-r ${getSeverityGradient(stat.level)} transition-all duration-1000 ease-out`} style={{ width: `${stat.percentage}%` }}></div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-8 flex flex-wrap gap-4 text-xs font-bold text-slate-500 pt-5 border-t border-slate-100">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg"><div className="w-3 h-3 rounded-full bg-blue-500 shadow-sm shadow-blue-200"></div> ระดับ A-B (ต่ำ)</div>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg"><div className="w-3 h-3 rounded-full bg-amber-500 shadow-sm shadow-amber-200"></div> ระดับ C-E (ปานกลาง)</div>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg"><div className="w-3 h-3 rounded-full bg-rose-500 shadow-sm shadow-rose-200"></div> ระดับ F-I (รุนแรงสูง)</div>
                </div>
              </div>

              <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100">
                <h2 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2.5">
                  <div className="w-2 h-6 bg-violet-500 rounded-full"></div>
                  เปรียบเทียบระหว่างหน่วยงาน
                </h2>
                <div className="space-y-5 overflow-y-auto pr-3 max-h-[480px] custom-scrollbar">
                  {deptStats.length > 0 ? deptStats.map((dept, index) => {
                      const maxCount = deptStats[0].count;
                      const barWidth = maxCount === 0 ? 0 : (dept.count / maxCount) * 100;
                      return (
                        <div key={dept.name} className="group">
                          <div className="flex justify-between text-sm mb-2">
                            <span className="font-bold text-slate-600 group-hover:text-slate-900 transition-colors">{index + 1}. {dept.name}</span>
                            <span className="font-black text-slate-800">{dept.count} <span className="font-medium text-slate-400 text-xs">ครั้ง</span></span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-3.5 overflow-hidden shadow-inner">
                            <div className="h-full rounded-full bg-gradient-to-r from-blue-400 to-blue-600 group-hover:from-blue-500 group-hover:to-blue-700 transition-all duration-1000 ease-out relative" style={{ width: `${barWidth}%` }}>
                              <div className="absolute top-0 right-0 bottom-0 left-0 bg-white/20"></div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  : <div className="text-center text-slate-400 py-12 flex flex-col items-center gap-3"><div className="p-4 bg-slate-50 rounded-full"><Building2 className="h-8 w-8 text-slate-300" /></div><p className="font-medium">ไม่พบข้อมูลอุบัติการณ์ของแผนกนี้ในช่วงเวลาที่เลือก</p></div>}
                </div>
              </div>
            </div>

            {/* ส่วนวิเคราะห์แนวโน้มเปรียบเทียบ (เพิ่มใหม่) */}
            <TrendAnalytics data={trendData} denominatorUnit={denominatorUnit} />

          </div>
        )}
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #e2e8f0; border-radius: 10px; }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb { background-color: #cbd5e1; }
      `}} />
    </div>
  );
}