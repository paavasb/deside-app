import React, { useContext } from 'react'
import YourQuestion from './YourQuestion'
import questionsList from '../playground/questions'
import QuestionsContext from '../context/questions-context'
import { firebase } from '../firebase/firebase';
import UserContext from '../context/user-context';
import { getYourQuestions } from '../selectors/questions';

const YourQuestions = () => {
    const { questions, dispatch } = useContext(QuestionsContext)
    const { user, userDispatch } = useContext(UserContext)
    //const [questions, setQuestions] = useState(questionsList)

    const yourQuestionsList = getYourQuestions(questions, user.userID)
    //TODO: Get questions from User's list of questions
    return (
        <div className="content-container">
            {yourQuestionsList.map((question) => {
                return (
                    <YourQuestion key={question.id} question={question}/>
                )
            })}
        </div>
    )
}

export default YourQuestions