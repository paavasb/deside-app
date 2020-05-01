import moment from 'moment';

// Filter Reducers 

export const filtersReducersDefaultState = {
    text: '',
    tag: '',
    sortBy: 'votes',
    startDate: moment().startOf('month'),
    endDate: moment().endOf('month'),
};

const filtersReducers = (state = filtersReducersDefaultState, action) => {
    switch(action.type) {
        case 'SET_TEXT_FILTER':
            return {
                ...state,
                text: action.text
            };
        case 'SET_TAG_FILTER':
            return {
                ...state,
                tag: action.tag
            }
        case 'SORT_BY':
            return {
                ...state,
                sortBy: action.sortBy
            };
        case 'SET_START_DATE':
            return {
                ...state,
                startDate: action.startDate,
            };
        case 'SET_END_DATE':
            return {
                ...state,
                endDate: action.endDate,
            };
        default:
            return state;
    }
};

export default filtersReducers;