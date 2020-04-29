import moment from 'moment'

export default [{
    title: 'What is the best pizza place?',
    options: [{
        text: 'Pizza Hut', votes: 10
    }, {
        text: 'Dominoes', votes: 29
    }, {
        text: 'Papa John\'s', votes: 7
    }],
    tags: ['Food', 'Pizza'],
    createdAt: moment().format(),
    creator: '1234'
},
{
    title: 'Where should I go to party?',
    options: [{
        text: 'Frats', votes: 19
    }, {
        text: 'Ranhas', votes: 9
    }, {
        text: 'Play', votes: 3
    }],
    tags: ['Party', 'Vandy'],
    createdAt: moment().format(),
    creator: '42060'
},
{
    title: 'Best housing at vandy?',
    options: [{
        text: 'EBI', votes: 76
    }, {
        text: 'Kissam', votes: 72
    }, {
        text: 'Chaffin', votes: 15
    }, {
        text: 'Stambaugh', votes: 36
    }],
    tags: ['Vandy', 'Housing'],
    createdAt: moment().format(),
    creator: '42060'
}]