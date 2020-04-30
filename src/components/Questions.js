import React, { useState, useContext, useEffect } from 'react'
import { checkVoted } from '../actions/questions'
import Question from './Question'
import questionsList from '../playground/questions'
import QuestionsContext from '../context/questions-context'
import database from '../firebase/firebase'
import * as firebase from 'firebase'

const Questions = () => {
    const { questions, dispatch } = useContext(QuestionsContext)
    //const [questions, setQuestions] = useState(questionsList)

    return (
        <div className="content-container">
            {questions.map((question, index) => {
                    return (<Question key={question.id} question={question} />)                  
                }
            )}
        </div>
    )
}

export default Questions