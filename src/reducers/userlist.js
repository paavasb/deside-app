export const userlistDefaultState = []

const userlistReducer = (state = userlistDefaultState, action) => {
    switch (action.type) {
        case 'SET_USERLIST':
            return action.userlist
        default:
            return state
    }
}

export default userlistReducer