import React, { useState, useContext } from 'react'
import TagsInput from 'react-tagsinput'
import { DateRangePicker } from 'react-dates'
import { setTextFilter, sortByDate, sortByVotes, setStartDate, setEndDate, setTagFilter, statusAll, statusAnswered, statusUnanswered } from '../actions/filters'
import FiltersContext from '../context/filters-context'

//TODO: Implement Autocomplete search for text filters
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
        e.preventDefault()
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
        e.preventDefault()
        switch (e.target.value) {
            case "date":
                return filtersDispatch(sortByDate())
            case "votes":
                return filtersDispatch(sortByVotes())
            default:
                return filtersDispatch(sortByVotes())
        }
    }

    const onStatusChange = (e) => {
        e.preventDefault()
        switch (e.target.value) {
            case "all":
                return filtersDispatch(statusAll())
            case "answered":
                return filtersDispatch(statusAnswered())
            case "unanswered":
                return filtersDispatch(statusUnanswered())
            default:
                return filtersDispatch(statusAll())
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
                        value={filters.status}
                        onChange={onStatusChange}
                    >
                        <option value="all">All Questions</option>
                        <option value="answered">Answered</option>
                        <option value="unanswered">Unanswered</option>
                    </select>
                    <select
                        className="select"
                        value={filters.sortBy}
                        onChange={onSortChange}
                    >
                        <option value="date">Order by: Date</option>
                        <option value="votes">Order by: Votes</option>
                    </select>
                    <DateRangePicker 
                        startDate={filters.startDate}
                        endDate={filters.endDate}
                        onDatesChange={onDatesChange}
                        focusedInput={calendarFocused}
                        onFocusChange={onFocusChange}
                        showClearDates={!!calendarFocused}
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