// Filter Actions

export const setTextFilter = (text = '') => ({
    type: 'SET_TEXT_FILTER',
    text
});

export const setTagFilter = (tag = '') => ({
    type: 'SET_TAG_FILTER',
    tag
});

export const sortByVotes = () => ({
    type: 'SORT_BY',
    sortBy: 'votes'
});

export const sortByDate = () => ({
    type: 'SORT_BY',
    sortBy: 'date'
});

//TODO: Figure out how to sort in other ways

export const setStartDate = (startDate) => ({  //undefined by default
    type: 'SET_START_DATE',
    startDate
});

export const setEndDate = (endDate) => ({
    type: 'SET_END_DATE',
    endDate
});