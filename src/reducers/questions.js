const questionsReducersDefaultState = [];

const questionsReducer = (state = questionsReducersDefaultState, action) => {
    switch (action.type) {
        case 'ADD_QUESTION':
            return [...state, action.question];
        case 'REMOVE_QUESTION':
            return state.filter((question) => question.id !== action.id);
        case 'VOTE_QUESTION':
            return state.map((question) => {
                if(question.id === action.id) {
                    return {
                        ...question,
                        options: action.updates
                    }
                } else {
                    return question;
                }
            });
        case 'CHANGE_ANONYMOUS':
            return state.map((question) => {
                if(question.id === action.id) {
                    return {
                        ...question,
                        anonymous: action.anonymous
                    }
                } else {
                    return question;
                }
            });
        case 'CHANGE_PRIVACY':
            return state.map((question) => {
                if(question.id === action.id) {
                    return {
                        ...question,
                        priv: action.priv
                    }
                } else {
                    return question;
                }
            })
        case 'SET_QUESTIONS':
            return action.questions;
        default:
            return state;
    }
};

export default questionsReducer;

        // case 'REMOVE_QUESTION':
        //     return state.filter((expense) => expense.id !== action.id);
        // case 'EDIT_EXPENSE':
        //     return state.map((expense) => {
        //             if(expense.id === action.id) {
        //                 return {
        //                     ...expense,
        //                     ...action.updates
        //                 }
        //             } else {
        //                 return expense;
        //             }
        //         });