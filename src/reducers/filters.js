import moment from 'moment';

// Filter Reducers 

export const filtersReducersDefaultState = {
    text: '',
    tag: [],
    sortBy: 'relevant',
    startDate: moment().startOf('year'),
    endDate: moment().endOf('year'),
    status: 'all'
};

const filtersReducers = (state = filtersReducersDefaultState, action) => {
    switch(action.type) {
        case 'SET_FILTER': 
            return action.filters
        case 'SET_TEXT_FILTER':
            return {
                ...state,
                text: action.text
            }
        case 'SET_TAG_FILTER':
            return {
                ...state,
                tag: action.tag
            }
        case 'SORT_BY':
            return {
                ...state,
                sortBy: action.sortBy
            }
        case 'SET_START_DATE':
            return {
                ...state,
                startDate: action.startDate,
            }
        case 'SET_END_DATE':
            return {
                ...state,
                endDate: action.endDate,
            }
        case 'SET_STATUS':
            return {
                ...state,
                status: action.status
            }
        default:
            return state;
    }
};

export default filtersReducers;