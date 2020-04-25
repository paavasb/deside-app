import * as firebase from 'firebase';

const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY, 
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    databaseURL: process.env.FIREBASE_DATABASE_URL,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID,
    measurementId: process.env.FIREBASE_MEASUREMENT_ID
  };

firebase.initializeApp(firebaseConfig);

const database = firebase.database();

const googleAuthProvider = new firebase.auth.GoogleAuthProvider();

export { firebase, googleAuthProvider, database as default };


//-----------------------------------------------------------------

// database.ref('expenses').on('child_removed', (snapshot) => {
//     console.log(snapshot.key, snapshot.val());
// });

// database.ref('expenses').on('child_changed', (snapshot) => {
//     console.log(snapshot.key, snapshot.val());
// });

// database.ref('expenses').on('child_added', (snapshot) => {
//     console.log(snapshot.key, snapshot.val());
// });

// database.ref('expenses')
//   .on('value', (snapshot) => {
//       const expenses = [];
//       snapshot.forEach((childSnapshot) => {
//           expenses.push({
//               id: childSnapshot.key,
//               ...childSnapshot.val()
//           });
//       });
//       console.log(expenses);
// });

// database.ref('expenses')
//   .once('value')
//   .then((snapshot) => {
//       const expenses = [];
//       snapshot.forEach((childSnapshot) => {
//           expenses.push({
//             id: childSnapshot.key,
//             ...childSnapshot.val()
//           });
//       });

//       console.log(expenses);
//   });

// database.ref('expenses').push({
//     description: 'Gum',
//     note: '',
//     amount: 195,
//     createdAt: 0
// });

// database.ref('expenses').push({
//     description: 'Rent',
//     note: '',
//     amount: 109500,
//     createdAt: 1000
// });

// database.ref('expenses').push({
//     description: 'Credit Card',
//     note: '',
//     amount: 4500,
//     createdAt: -1000
// });



// database.ref('notes/-M58EAptvGslceygEaQZ').remove();

// database.ref('notes').push({
//     title: 'Course Topics',
//     body: 'React, Redux'
// });

// const firebaseNotes = {
//     notes: {
//         apkofjr: {
//             title: 'First note!',
//             body: 'This is my note'
//         },
//         ihoihorf: {
//             title: 'Another note!',
//             body: 'This is my note'
//         }
//     }
// };

// const notes =[{
//     id: '12',
//     title: 'First note!',
//     body: 'This is my note'
// }, {
//     id: '76',
//     title: 'Another note!',
//     body: 'This is my note'
// }];

// database.ref('notes').set(notes);

// const onValChange = database.ref().on('value', (snapshot) => {
//     const person = snapshot.val();
//     console.log(`${person.name} is a ${person.job.title} at ${person.job.company}.`);
// }, (e) => {
//     console.log('Error:', e);
// });

// const onValueChange = database.ref().on('value', (snapshot) => {
//     console.log(snapshot.val());
// }, (error) => {
//     console.log('Error with data fetching', error);
// });

// setTimeout(() => {
//     database.ref('age').set(21);
// }, 3500);

// setTimeout(() => {
//     database.ref().off(onValueChange);
// }, 7000);

// setTimeout(() => {
//     database.ref('age').set(23);
// }, 10500);


// database.ref('location/country')
//     .once('value')
//     .then((snapshot) => {
//         const val = snapshot.val();
//         console.log(val);
//     })
//     .catch((e) => {
//         console.log('Error fetching data', e);
//     });


// database.ref().set({
//     name: 'Paavas Bhasin',
//     age: 20,
//     stressLevel: 6,
//     job: {
//         title: 'Soft Dev',
//         company: 'Facebook'    
//     },
//     location: {
//         city: 'New Delhi',
//         country: 'India'
//     }
// }).then(() => {
//     console.log('Data is saved');
// }).catch((error) => {
//     console.log('This failed.', error);
// });

// database.ref().update({
//     stressLevel: 9,
//     'job/company': 'Amazon',
//     'location/city': 'Seattle'
// });

// database.ref()
//     .remove()
//     .then(() => {
//         console.log('isSingle removed');
//     }).catch((error) => {
//         console.log('This failed', error);
//     });