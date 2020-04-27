import database from '../firebase/firebase';

export const addQuestion = (question) => ({
    type: 'ADD_QUESTION',
    question
});

export const startAddQuestion = (questionData = {}) => {
    console.log('Yo');
    return (dispatch, getState) => {
        console.log('YoYp');
        //const uid = getState().auth.uid;
        const {
            questionText = '', 
            options = [],
            tags = [], 
            createdAt = 0,
        } = questionData;
        const question = { questionText, options, tags, createdAt, creator: '123' };
        return database.ref(`all-questions`).push(question).then((ref)=> {
            console.log('Hey');
            dispatch(addQuestion({
                id: ref.key,
                ...question
            }));
        });
    };
};

// return database.ref(`users/${uid}/questions`).push(question).then((ref)=> {
//     console.log('Hey');
//     database.ref(`all-questions`).push(question).then((ref) => {
//         dispatch(addQuestion({
//             id: ref.key,
//             ...question
//         }));
//         console.log(question);
//     })
// });