const questionsReducersDefaultState = [];

const questionsReducer = (state = questionsReducersDefaultState, action) => {
    switch (action.type) {
        case 'ADD_QUESTION':
            return [...state, action.question];
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
        case 'SET_QUESTIONS':
            return action.questions;
        default:
            return state;
    }
};

export default questionsReducer;