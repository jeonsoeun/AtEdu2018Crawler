const firebase = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');
  function setDatabase () {
    firebase.initializeApp({
      credential: firebase.credential.cert(serviceAccount),
      databaseURL: 'http://debc-ccb7e.firebaseio.com'
    });
  }

  function inputData (siteName, data) {
    let file_paths = [];
    for (let i = 0; i < data.files[i]; ++i) {
      file_paths.push(data.file[i].path);
    }
    const db = firebase.database();
    const ref = db.ref(`data/${siteName}`);
    var count = ref.on('value',function(data){
      console.log(data.val());
    },function (err){
      console.log(err);
    })
    let dataRef = ref.child(`info`);
    dataRef.set({
      title: data.title,
      writer: data.who_write,
      date: data.date,
      is_file: data.is_file,
      file_path: file_paths,
      content: data.content,
      id: data.id

    })
  }

  module.exports = {
    inputData:(siteName,data) => {
      inputData(siteName, data)
    },
    initialDatabase:()=>{
      setDatabase();
    }
  }