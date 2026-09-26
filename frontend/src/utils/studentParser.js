/**
 * AssessPro BIT Email Parser & Department/Year Predictor
 * Bannari Amman Institute of Technology (@bitsathy.ac.in)
 */

export const DEPARTMENT_MAP = {
  cs: 'Computer Science and Engineering',
  it: 'Information Technology',
  ad: 'Artificial Intelligence and Data Science',
  al: 'Artificial Intelligence and Machine Learning',
  cb: 'Computer Science and Business Systems',
  cd: 'Computer Science and Design',
  ct: 'Computer Technology',
  ec: 'Electronics and Communication Engineering',
  ee: 'Electrical and Electronics Engineering',
  ei: 'Electronics and Instrumentation Engineering',
  me: 'Mechanical Engineering',
  mz: 'Mechatronics Engineering',
  mt: 'Mechatronics Engineering',
  mc: 'Mechatronics Engineering',
  au: 'Automobile Engineering',
  ce: 'Civil Engineering',
  bt: 'Biotechnology',
  bm: 'Biomedical Engineering',
  ag: 'Agricultural Engineering',
  ft: 'Food Technology',
  tt: 'Textile Technology',
  fd: 'Fashion Technology',
  is: 'Information Science and Engineering'
};

/**
 * Predicts student department, academic year, and name from official email
 * Format: <name>.<dept><batch>@bitsathy.ac.in (e.g. krithickrajs.cs25@bitsathy.ac.in)
 */
export const parseBitEmail = (email = '') => {
  if (!email) return null;
  const clean = email.trim().toLowerCase();
  const isBitDomain = clean.endsWith('@bitsathy.ac.in');

  const match = clean.match(/^([a-z0-9._]+)\.([a-z]{2,3})(\d{2})@bitsathy\.ac\.in$/i);

  if (!match) {
    return {
      isStudent: !isBitDomain || clean.includes('.cs') || clean.includes('.it'),
      name: clean.split('@')[0],
      formattedName: clean.split('@')[0].toUpperCase(),
      deptCode: '',
      department: isBitDomain ? 'Faculty / Administration' : '',
      batchNum: '',
      academicYear: isBitDomain ? 'Staff' : '',
      predictedRegNo: '',
      institution: isBitDomain ? 'Bannari Amman Institute of Technology' : ''
    };
  }

  const rawName = match[1];
  const deptCode = match[2].toLowerCase();
  const batchNum = match[3];

  const department = DEPARTMENT_MAP[deptCode] || `${deptCode.toUpperCase()} Engineering`;

  let academicYear = 'II Year';
  if (batchNum === '26') academicYear = 'I Year (First Year)';
  else if (batchNum === '25') academicYear = 'II Year (Second Year)';
  else if (batchNum === '24') academicYear = 'III Year (Third Year)';
  else if (batchNum === '23') academicYear = 'IV Year (Final Year)';

  return {
    isStudent: true,
    name: rawName,
    formattedName: rawName.toUpperCase().replace(/\./g, ' '),
    deptCode,
    department,
    batchNum,
    academicYear,
    predictedRegNo: `7376${batchNum}1${deptCode.toUpperCase()}101`,
    institution: 'Bannari Amman Institute of Technology'
  };
};



/**
 * Master Admin Email: krithickrajs.cs25@bitsathy.ac.in
 * Keeps the master control dashboard to handle students, faculty, and admin views.
 */
export const MASTER_ADMIN_EMAIL = 'krithickrajs.cs25@bitsathy.ac.in';

export const isMasterAccount = (email = '') => {
  const clean = (email || '').trim().toLowerCase();
  return clean === 'krithickrajs.cs25@bitsathy.ac.in' || clean.startsWith('admin');
};
