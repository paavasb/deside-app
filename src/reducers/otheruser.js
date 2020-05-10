export const otherUserDefaultState = {}

const otheruserReducer = (state = otherUserDefaultState, action) => {
    switch (action.type) {
        case 'SET_FOLLOWSTATUS':
            return {
                ...state,
                followStatus: action.followStatus
            }
        case 'SET_OTHERUSER':
            return action.otheruser
        case 'GET_OTHERUSER':
            return action.otheruser
        default:
            return state
    }
}

export default otheruserReducer