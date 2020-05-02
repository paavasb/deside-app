import moment from 'moment';

// Filter Reducers 

export const answeredReducersDefaultState = []

const answeredReducer = (state = answeredReducersDefaultState, action) => {
    switch(action.type) {
        case 'ADD_ANSWERED_QUESTION':
            return [...state, action.answered_question]
        case 'REMOVE_ANSWERED_QUESTION':
            return state.filter((questionID) => questionID !== action.id)
        case 'SET_QUESTIONS_ANSWERED':
            return action.answered_questions
        default:
            return state
    }
};

export default answeredReducer