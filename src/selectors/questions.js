import moment from 'moment'

const getVisibleQuestions = (questions, {text, tag, sortBy, startDate, endDate}) => {
    return questions.filter((question) => {
        const createdAtMoment = moment(question.createdAt)
        const startDateMatch = startDate ? startDate.isSameOrBefore(createdAtMoment, 'day') : true
        const endDateMatch = endDate ? endDate.isSameOrAfter(createdAtMoment, 'day') : true
        const textMatch = question.title.toLowerCase().includes(text.toLowerCase())
        const tagMatch = !tag ? true : question.tags.map((tag) => tag.toLowerCase()).includes(tag.toLowerCase())

        return textMatch && tagMatch && startDateMatch && endDateMatch
    }).sort((a, b) => {
        if(sortBy === 'date') {
            return a.createdAt < b.createdAt ? 1 : -1
        } else if(sortBy === 'votes') {
            return totalVotes(a) < totalVotes(b) ? 1 : -1
        }
    })
}

export default getVisibleQuestions

const totalVotes = (question) => {
    let total = 0
    question.options.forEach((option) => {
        total += option.votes
    })
    return total
}