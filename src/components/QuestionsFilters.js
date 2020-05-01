import React, { useState, useContext } from 'react'
import TagsInput from 'react-tagsinput'
import { DateRangePicker } from 'react-dates'
import { setTextFilter, sortByDate, sortByVotes, setStartDate, setEndDate, setTagFilter } from '../actions/filters'
import FiltersContext from '../context/filters-context'

const QuestionsFilters = () => {
    const { filters, filtersDispatch } = useContext(FiltersContext)
    const [calendarFocused, setCalendarFocused] = useState()
    const [text, setText] = useState(filters.text)
    const [tag, setTag] = useState(filters.tag)
    const [placeHolderText, setPlaceholderText] = useState(filters.tag.length === 0 ? "Search Question Tags" : "")

    const onDatesChange = ({ startDate, endDate }) => {
        filtersDispatch(setStartDate(startDate))
        filtersDispatch(setEndDate(endDate))
    }

    const onFocusChange = (calendarFocused) => {
        setCalendarFocused(calendarFocused)
    }
    
    const onTextValueChange = (e) => {
        e.preventDefault
        setText(e.target.value)
    }
    const onTextChange = () => {
        filtersDispatch(setTextFilter(text))
    }

    const onTagValueChange = (tags) => {
        //e.preventDefault()
        //setTag(e.target.value)
        setTag(tags)
        setPlaceholderText(tags.length === 0 ? "Search Question Tags" : "")
    }
    const onTagChange = () => {
        filtersDispatch(setTagFilter(tag))
    }

    const onTextTagChange = (e) => {
        e.preventDefault()
        onTextChange()
        onTagChange()
    }

    const onSortChange = (e) => {
        switch (e.target.value) {
            case "date":
                return filtersDispatch(sortByDate())
            case "votes":
                return filtersDispatch(sortByVotes())
            default:
                return filtersDispatch(sortByVotes())
        }
    }

    return (
        <div className="content-container-search">
            <div className="input-group">
                <div className="input-group__row">
                    <input 
                        type="text"
                        className="text-input"
                        placeholder="Search Question Title"
                        value={text}
                        onChange={onTextValueChange}
                    />
                    <TagsInput 
                        value={tag} onlyUnique={true} 
                        onChange={onTagValueChange}
                        className='text-input-react-tagsinput'
                        inputProps={{
                            className: 'text-input-react-tagsinput-input',
                            placeholder: placeHolderText
                        }}
                        tagProps={{
                            className: 'text-input-react-tagsinput-tag'
                        }}
                    />
                    <button className="button button--search" onClick={onTextTagChange}>Search for Question</button>
                </div>
                <div className="input-group__row">
                    <select
                        className="select"
                        value={filters.sortBy}
                        onChange={onSortChange}
                    >
                        <option value="date">Date</option>
                        <option value="votes">Votes</option>
                    </select>
                    <DateRangePicker 
                        startDate={filters.startDate}
                        endDate={filters.endDate}
                        onDatesChange={onDatesChange}
                        focusedInput={calendarFocused}
                        onFocusChange={onFocusChange}
                        showClearDates={true}
                        numberOfMonths={1}
                        isOutsideRange={() => false}
                    />
                </div>
            </div>
        </div>
    )
}

export default QuestionsFilters

// <input 
// type="text"
// className="text-input"
// placeholder="Search Question Tags"
// value={tag}
// onChange={onTagValueChange}
// />