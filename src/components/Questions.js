import React, { useState, useContext, useEffect } from 'react'
import { checkVoted } from '../actions/questions'
import Question from './Question'
import QuestionsFilters from './QuestionsFilters'
import questionsList from '../playground/questions'
import QuestionsContext from '../context/questions-context'
import database from '../firebase/firebase'
import * as firebase from 'firebase'
import FiltersContext from '../context/filters-context'
import getVisibleQuestions from '../selectors/questions'

const Questions = () => {
    const { questions, dispatch } = useContext(QuestionsContext)
    const { filters, filtersDispatch } = useContext(FiltersContext) 
    //const [questions, setQuestions] = useState(questionsList)
    console.log(filters)
    let visibleQuestions = getVisibleQuestions(questions, filters)

    return (
        <div className="content-container">
            <QuestionsFilters />
            <div className="content-container-questions">
                {visibleQuestions.map((question, index) => {
                        return (<Question key={question.id} question={question} />)                  
                    }
                )}
            </div>
        </div>
    )
}

export default Questions