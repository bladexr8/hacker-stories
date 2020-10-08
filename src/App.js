import React from 'react';

// initial list of stories
const initialStories = [
  {
    title: 'React',
    url: 'https://reactjs.org',
    author: 'Jordan Walke',
    num_comments: 3,
    points: 4,
    objectID: 0
  },
  {
    title: 'Redux',
    url: 'https://redux.js.org',
    author: 'Dan Abramov, Andrew Clark',
    num_comments: 2,
    points: 5,
    objectID: 1
  },
  {
    title: 'Nodejs',
    url: 'https://nodejs.org',
    author: 'Ryan Dahl',
    num_comments: 3,
    points: 10,
    objectID: 2
  },
  {
    title: 'Swift',
    url: 'https://developer.apple.com',
    author: 'Apple',
    num_comments: 3,
    points: 8,
    objectID: 3
  },
  {
    title: '.NET Framework',
    url: 'https://microsoft.com',
    author: 'Microsoft',
    num_comments: 3,
    points: 8,
    objectID: 4
  },
  {
    title: 'AWS Lambda',
    url: 'https://aws.com',
    author: 'Amazon',
    num_comments: 3,
    points: 9,
    objectID: 5
  },
]

// reducer function
const storiesReducer = (state, action) => {
  switch (action.type) {
    case 'STORIES_FETCH_INIT':
    return {
      ...state,
      isLoading: true,
      isError: false
    }  
    case 'STORIES_FETCH_SUCCESS':
      return {
        ...state,
        isLoading: false,
        isError: false,
        data: action.payload,
      }
    case 'STORIES_FETCH_FAILURE':
      return {
        ...state,
        isLoading: false,
        isError: true,
      }
    case 'REMOVE_STORY':
      return {
        ...state,
        data: state.data.filter(
          story => action.payload.objectID !== story.objectID
        ) 
      } 
    default:
      throw new Error()
  }
}

// simulate async fetching of data from an API
const getAsyncStories = () =>
  new Promise(resolve =>
    setTimeout( 
      () => resolve({ data: { stories: initialStories}}),
      2000
    )
  );

// custom hook
const useSemiPersistentState = (key, initialState) => {
  // useState React hook, uses initial state as an argument
  // searchTerm = current state
  // setSearchTerm = function to update state
  // array destructuring used to populate with return values from useState
  const [value, setValue] = React.useState(
    localStorage.getItem(key) || initialState
  );

  // React useEffect hook
  // first argument is function to be called every time searchTerm changes
  // second argument is dependency array of variables
  React.useEffect(() => {
    localStorage.setItem(key, value);
  }, [value, key]);

  return [value, setValue];

}

// Main App Component
const App = () => {

  const [searchTerm, setSearchTerm] = useSemiPersistentState('search', '');

  // state for async data loading
  const [stories, dispatchStories] = React.useReducer(storiesReducer, 
    { data: [], isLoading: false, isError: false}
  );

  // simulate asyc fetching of stories
  // Note empty dependency array, the side-effect only runs once
  // when component renders for the first time
  React.useEffect(() => {
    dispatchStories({ type: 'STORIES_FETCH_INIT'});

    getAsyncStories().then((result) => {
      dispatchStories({
        type: 'STORIES_FETCH_SUCCESS',
        payload: result.data.stories,
      })
    })
    .catch(() => dispatchStories({ type: 'STORIES_FETCH_FAILURE' }));
  }, [])

  const handleRemoveStory = item => {
    dispatchStories({
      type: 'REMOVE_STORY',
      payload: item,
    })
  }

  const handleSearch = event => {
    setSearchTerm(event.target.value);
  };

  const searchedStories = stories.data.filter(story => 
    story.title
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <h1>My Hacker Stories</h1>

      <InputWithLabel 
        id="search"
        value={searchTerm} 
        isFocused
        onInputChange={handleSearch}
      >
        <strong>Search:</strong>
      </InputWithLabel>

      <p>
        Searching for <strong>{searchTerm}</strong>
      </p>

      <hr />

      {/* conditional render if error loading data */}
      {stories.isError && <p>Something went wrong...</p>}

      {/* conditional rendering if loading data */}
      {stories.isLoading ? (
        <p>Loading...</p>
      ) : (
        <List list={searchedStories} onRemoveItem={handleRemoveStory} />
      )}
      
    </div>
  );
};

// Search Component
// A - create a "ref" with React's useRef hook. This contains a mutable "current" property.
//     "ref" itself is a persistent value which stays intact over lifetime of React component
// B - ref is passed to input field's JSX reserved "ref" attribute and the element
//     instance is assigned to the changeable "current" property
// C - opt into React's lifecycle with "useEffect" hook, performing the focus on the input
//     field when the component renders
// D - since ref is passed to the input field's "ref" attribute, it's current property
//     gives access to the element. Execute focus programmatically as a side-effect, but only
//     if "isFocused" is set and "current" property is existent
const InputWithLabel = ({ id, value, type='text', onInputChange, isFocused, children}) => {

    // A
    const inputRef = React.useRef();

    // C
    React.useEffect(() => {
      if (isFocused && inputRef.current) {
        // D
        inputRef.current.focus()
      }
    }, [isFocused]);
  
    return (
      <>
      {/* React Fragment */}
      <label htmlFor={id}>{children}</label>
      &nbsp;
      {/* B */}
      <input
        ref={inputRef} 
        id={id} 
        type={type} 
        value={value} 
        autoFocus={isFocused} 
        onChange={onInputChange} 
      />
      </>
    );

};

// List Component
const List = ({ list, onRemoveItem }) => 
  list.map(item => <Item key={item.objectID} item={item} onRemoveItem={onRemoveItem} />);
      
// Item component
const Item = ({ item, onRemoveItem }) => {
  
  // remove an item from list
  const handleRemoveItem = () => 
    onRemoveItem(item);

  return (
  <div>
    <span>
      <a href={item.url}>{item.title} </a>
    </span>
    <span>{item.author} </span>
    <span>{item.num_comments} </span>
    <span>{item.points} </span>
    <span>
      <button type="button" onClick={handleRemoveItem}>
        Dismiss
      </button>
    </span>
  </div>
  );
};

export default App;
