import React, { useState, useContext, useEffect, useReducer } from 'react'
import { checkVoted } from '../actions/questions'
import Question from './Question'
import QuestionsFilters from './QuestionsFilters'
import QuestionsContext from '../context/questions-context'
import database from '../firebase/firebase'
import * as firebase from 'firebase'
import FiltersContext from '../context/filters-context'
import getVisibleQuestions from '../selectors/questions'
import AnsweredContext from '../context/answered-context'
import { setQuestions, startSetQuestion } from '../actions/questions'
import { startSetAnsweredQuestions } from '../actions/answered'
import answeredReducer from '../reducers/answered'
import { setFilters } from '../actions/filters'
import filtersReducers, { filtersReducersDefaultState } from '../reducers/filters'
import userReducer, { userReducerDefaultState } from '../reducers/user'
import { startSetUser, startSetAnswered } from '../actions/user'
import UserContext from '../context/user-context'

//TODO: Display results of question before shifting focus from the question
//TODO: Decide where to keep Answered Context - here or in Private
const Questions = () => {
    const { questions, dispatch } = useContext(QuestionsContext)
    const { user, userDispatch } = useContext(UserContext)
    //const [filters, filtersDispatch] = useReducer(filtersReducers, filtersReducersDefaultState)
    const { filters, filtersDispatch } = useContext(FiltersContext)
    const [answered, answeredDispatch] = useReducer(answeredReducer, [])
    //const [user, userDispatch] = useReducer(userReducer, userReducerDefaultState)
    //const [visibleQuestions, setVisibleQuestion] = useState(getVisibleQuestions(questions, filters, answered, user.following))

    //const [isAnswered, setIsAnswered] = useState('all')
    useEffect(() => {
        let mounted = true
        async function startUseEffect() {
            //Cleanup: ('Questions UseEffect')
            //Cleanup: console.log('User ', user)
            await startSetAnsweredQuestions(answeredDispatch)
            //await startSetAnswered(userDispatch)
        }
        //startSetUser(userDispatch)
        //filtersDispatch(setFilters(filtersReducersDefaultState))
        if(mounted) {
            startUseEffect()
        }
        return () => mounted = false
    }, []) 

    useEffect(() => {
        //Cleanup: ('Filters')
        //setVisibleQuestion(getVisibleQuestions(questions, filters, answered, user.following))
    }, [filters])

    let visibleQuestions = getVisibleQuestions(questions, filters, answered, user.following)

    return (
        <FiltersContext.Provider value={{filters, filtersDispatch}}> 
            <AnsweredContext.Provider value={{answered, answeredDispatch}}>
                <div className="content-container">
                    <QuestionsFilters />
                    <div className="content-container-questions">
                        {visibleQuestions.map((question, index) => {
                                return (<Question key={question.id} question={question} />)                  
                            }
                        )}
                    </div>
                </div>
            </AnsweredContext.Provider>
        </FiltersContext.Provider> 
    )
}

export default Questions