export const userReducerDefaultState = {
    userID: '',
    username: '',
    questions: [],
    following: [],
    answered: []
}

const userReducer = (state = userReducerDefaultState, action) => {
    switch (action.type) {
        case 'SET_USER':
            return action.user
        case 'SET_USERID':
            return {
                ...state,
                userID: action.userID
            }
        case 'SET_USERNAME':
            return {
                ...state,
                username: action.username
            }
        case 'ADD_USER_QUESTION':
            return {
                ...state,
                questions: [...state.questions, action.question]
            }
        case 'REMOVE_USER_QUESTION':
            return {
                ...state,
                questions: state.questions.filter((question) => question === action.question)
            }
        case 'SET_USER_QUESTIONS':
            return {
                ...state,
                questions: action.questions
            }
        case 'ADD_FOLLOWING':
            return {
                ...state,
                following: [...state.following, action.followingID]
            }
        case 'SET_FOLLOWING':
            return {
                ...state,
                following: action.followingIDs
            }
        case 'ADD_ANSWERED':
            return {
                ...state,
                answered: [...state.answered, action.answeredQuestion]
            }
        case 'SET_ANSWERED':
            return {
                ...state,
                answered: action.answeredQuestions
            }
        default:
            return state
    }
}

export default userReducer
// User Structure: 
// user : {
//     userID: unique string from firebase,
//     userName: unique string,
//     questions: array of refIDs of questions,
//     following: array of userIDs of others,
//     ??followers: array of userIDs of others,
//     answered: array of questionsIDs of questions answered
// }