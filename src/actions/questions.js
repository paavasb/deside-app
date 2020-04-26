import database from '../firebase/firebase';

export const addQuestion = (question) => ({
    type: 'ADD_QUESTION',
    question
});

export const startAddExpense = (questionData = {}) => {
    return (dispatch, getState) => {
        const uid = getState().auth.uid;
        const {
            questionText = '', 
            options = [],
            tags = [], 
            createdAt = 0,
            creator = uid
        } = questionData;
        const question = { questionText, options, tags, createdAt, creator };

        return database.ref(`users/${uid}/questions`).push(question).then((ref)=> {
            database.ref(`all-questions`).push(question).then((ref) => {
                dispatch(addQuestion({
                    id: ref.key,
                    ...question
                }));
            })
        });
    };
};