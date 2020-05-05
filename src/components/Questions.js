import React, { useState, useContext, useEffect, useReducer } from 'react'
import { checkVoted } from '../actions/questions'
import Question from './Question'
import QuestionsFilters from './QuestionsFilters'
import questionsList from '../playground/questions'
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
import { startSetUser } from '../actions/user'
import UserContext from '../context/user-context'

const Questions = () => {
    const { questions, dispatch } = useContext(QuestionsContext)
    const { user, userDispatch } = useContext(UserContext)
    const [filters, filtersDispatch] = useReducer(filtersReducers, filtersReducersDefaultState)
    //const { filters, filtersDispatch } = useContext(FiltersContext)
    const [answered, answeredDispatch] = useReducer(answeredReducer, [])
    //const [user, userDispatch] = useReducer(userReducer, userReducerDefaultState)

    //const [isAnswered, setIsAnswered] = useState('all')
    useEffect(() => {
        let mounted = true
        async function startUseEffect() {
            console.log('Questions UseEffect')
            console.log('User ', user)
            await startSetAnsweredQuestions(answeredDispatch)
        }
        //startSetUser(userDispatch)
        //filtersDispatch(setFilters(filtersReducersDefaultState))
        if(mounted) {
            startUseEffect()
        }
        return () => mounted = false
    }, []) 

    let visibleQuestions = getVisibleQuestions(questions, filters, answered)

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