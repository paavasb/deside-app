//
// Object
//

// const person = {
//     name: 'Paavas',
//     age: 20,
//     location: {
//         city: 'New Delhi',
//         temp: 95,
//     }
// };

// const {name: firstName = 'Anonymous', age} = person;
// // const name = person.name;
// // const age = person.age;

// console.log(`${firstName} is ${age}.`);

// const {city, temp: temperature} = person.location;
// if(city && temperature) {
//     console.log(`It's ${temperature} in ${city}.`);
// }

// const book = {
//     title: 'Ego is the Enemy',
//     author: 'Ryan Holiday',
//     publisher: {
//         name: 'Penguin'
//     }
// };

// const {name: publisherName = 'Self Published'} = book.publisher;

// console.log(publisherName);


//
// Array
//

const address = ['1299 S Juniper Street', 'Philadelphia', 'Pennsylvania', '19147'];
const [, city, state = 'New York'] = address;
console.log(`You are in ${city}, ${state}.`)

const item = ['Coffee (iced)', '$3.00', '$3.50', '$3.75'];
const [description, , mediumCost] = item;
console.log(`A medium ${description} costs ${mediumCost}.`);
