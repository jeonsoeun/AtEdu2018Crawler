const firebase = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');
const filter = require('./Filtering');
let count = 0;
function setDatabase() {
  if (!firebase.apps.length) {
    firebase.initializeApp({
      credential: firebase.credential.cert(serviceAccount),
      databaseURL: 'http://ateducom2018-213017.firebaseio.com'
    });
  }
}

function inputData(siteName, data) {
  let file_paths = [];
  if (data.files && data.files.length > 0) {
    for (let i = 0; i < data.files[i]; ++i) {
      file_paths.push(data.file[i].path);
    }
  }
  const db = firebase.database();
  const ref = db.ref(`data/${siteName}`);
  let dataRef = ref.child(`info${count++}`);
  const filtered = filter.FilteringTag(data.content);
  dataRef.set({
    title: data.title,
    writer: data.who_write,
    date: data.date,
    is_file: data.is_file,
    files: data.files,
    content: filtered,
    id: data.id
  });
  const countRef = ref.child('count');
  countRef.set({
    childNum:count
  })
}

module.exports = {
  inputData: async (siteName, data) => {
    inputData(siteName, data)
  },
  initialDatabase: () => {
    setDatabase();
  }
}