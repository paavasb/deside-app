import React, { useState, useContext } from 'react'
import Question from './Question'
import questionsList from '../playground/questions'
import QuestionsContext from '../context/questions-context'

const Questions = () => {
    // useContext(QuestionsContext)
    const [questions, setQuestions] = useState(questionsList)

    return (
        <div>
            {questions.map((question, index) => (
                <Question key={question.title} question={question}/>
            ))}
        </div>
    )
}

export default Questions