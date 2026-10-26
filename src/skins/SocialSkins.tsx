import { useSkinState } from "../skinState";
import {
  ArrowDown,
  ArrowUp,
  AtSign,
  Bookmark,
  Camera,
  ChevronRight,
  Grid,
  Hash,
  Heart,
  Home,
  MessageCircle,
  Repeat2,
  User,
  Users,
} from "lucide-react";
import { useState } from "react";
import type { Item } from "../schema";
import {
  Avatar,
  Empty,
  groupItems,
  Header,
  Media,
  meta,
  SearchBox,
  Tabs,
  useContent,
  type Props,
} from "./shared";

type LocalSocialComment = { author: string; body: string };
type LocalSocialPost = {
  id: string; body: string; title: string; media: string; createdAt: string; author: string;
  likes: number; liked: boolean; saved: boolean; comments: LocalSocialComment[];
};
type LocalSocialState = { posts: LocalSocialPost[] };
const emptySocialState: LocalSocialState = { posts: [] };
const outsideComments = [
  { author: "晚风慢慢", body: "先不站队，等完整信息吧" },
  { author: "小鱼不熬夜", body: "文字看着挺真诚的" },
  { author: "路过的网友", body: "评论区先别吵了" },
  { author: "今天也要开心", body: "希望大家都能好好说话" },
  { author: "匿名用户", body: "只看这条的话，我觉得没什么问题" },
  { author: "吃瓜但不造谣", body: "别把猜测当事实传" },
];
function readLocalState(raw: string | number | boolean | string[] | undefined): LocalSocialState {
  if (typeof raw !== "string") return emptySocialState;
  try {
    const value = JSON.parse(raw) as LocalSocialState;
    return value && Array.isArray(value.posts) ? value : emptySocialState;
  } catch { return emptySocialState; }
}
function LocalSocialComposer({ app, onPublish }: { app: "weibo" | "redbook"; onPublish: (body: string, media: string) => void }) {
  const [body, setBody] = useState("");
  const [media, setMedia] = useState("");
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const pickImage = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) { setError("请选择图片文件"); return; }
    if (file.size > 8 * 1024 * 1024) { setError("图片请控制在 8 MB 以内"); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const data = typeof reader.result === "string" ? reader.result : "";
      if (data && /^data:image\/(png|jpeg|webp|gif);base64,/.test(data)) {
        setMedia(data); setFileName(file.name); setError("");
      } else setError("这张图片暂时无法读取");
    };
    reader.onerror = () => setError("图片读取失败，请重试");
    reader.readAsDataURL(file);
  };
  return <form className={`local-social-composer ${app}`} onSubmit={(e) => {
    e.preventDefault();
    if (!body.trim() && !media) { setError("写点文字或添加一张图片再发布"); return; }
    onPublish(body.trim(), media); setBody(""); setMedia(""); setFileName(""); setError("");
  }}>
    <textarea aria-label="帖子正文" value={body} onChange={(e) => setBody(e.target.value)} placeholder={app === "weibo" ? "有什么新鲜事想说？" : "分享此刻的生活和想法…"} maxLength={2000} />
    {media && <div className="local-social-preview"><img src={media} alt="待发布图片" /><button type="button" onClick={() => { setMedia(""); setFileName(""); }}>移除图片</button></div>}
    <div className="local-social-compose-tools">
      <label className="local-social-image"><Camera size={17} /> 图片<input aria-label="选择图片" type="file" accept="image/*" onChange={(e) => pickImage(e.target.files?.[0])} /></label>
      <small>{fileName || `${body.length}/2000`}</small>
      <button type="submit" className="local-social-publish">发布</button>
    </div>
    {error && <small className="local-social-error" role="status">{error}</small>}
  </form>;
}
function LocalSocialFeed({ p, app, items, savedOnly = false }: { p: Props; app: "weibo" | "redbook"; items: Item[]; savedOnly?: boolean }) {
  const [raw, setRaw] = useSkinState<string>(p, "local-social-feed-v1", JSON.stringify(emptySocialState));
  const state = readLocalState(raw);
  const save = (next: LocalSocialState) => setRaw(JSON.stringify(next));
  const basePosts: LocalSocialPost[] = items.map((item) => ({
    id: item.id, title: item.title, body: item.body, media: item.media,
    createdAt: item.time, author: item.sender, likes: item.likes, liked: false, saved: item.favorite,
    comments: item.comments.map((comment) => {
      const split = comment.indexOf("：");
      return split > -1 ? { author: comment.slice(0, split), body: comment.slice(split + 1) } : { author: "评论", body: comment };
    }),
  }));
  const posts = [
    ...state.posts.filter((post) => post.id.startsWith("local-")),
    ...basePosts.map((base) => {
      const changed = state.posts.find((post) => post.id === base.id);
      return changed ? { ...base, ...changed } : base;
    }),
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const publish = (body: string, media: string) => {
    const now = new Date();
    const createdAt = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")} ${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
    const post: LocalSocialPost = { id: `local-${Date.now()}-${Math.random().toString(36).slice(2,7)}`, title: body.slice(0, 36) || "图片分享", body, media, createdAt, author: p.owner || "我", likes: 0, liked: false, saved: false, comments: [] };
    save({ posts: [post, ...state.posts] });
  };
  const toggleLike = (post: LocalSocialPost) => {
    const liked = !post.liked;
    let comments = post.comments;
    let likes = post.likes;
    if (liked) {
      likes += 1;
      const roll = Math.random();
      if (roll < 0.34 && !comments.some((c) => c.author === "朱志鑫")) {
        const replies = app === "weibo"
          ? ["看到了", "别太晚睡", "这条我先占个位置", "挺好的，继续发"]
          : ["这个拍得不错", "喜欢这个", "下次也发给我看看", "这张留着"];
        comments = [...comments, { author: "朱志鑫", body: replies[Math.floor(Math.random() * replies.length)] }];
      } else if (roll < 0.72) {
        const reply = outsideComments[Math.floor(Math.random() * outsideComments.length)];
        comments = [...comments, reply];
      }
    } else likes = Math.max(0, likes - 1);
    save({ posts: state.posts.filter((x) => x.id !== post.id).concat({ ...post, liked, likes, comments }) });
  };
  const addComment = (post: LocalSocialPost, body: string) => {
    if (!body.trim()) return;
    save({ posts: state.posts.filter((x) => x.id !== post.id).concat({ ...post, comments: [...post.comments, { author: p.owner || "我", body: body.trim() }] }) });
  };
  const toggleSave = (post: LocalSocialPost) => save({ posts: state.posts.filter((x) => x.id !== post.id).concat({ ...post, saved: !post.saved }) });
  const visiblePosts = savedOnly ? posts.filter((post) => post.saved) : posts;
  return <div className={`local-social-feed ${app}`}>
    <LocalSocialComposer app={app} onPublish={publish} />
    {visiblePosts.map((post) => <LocalSocialCard key={post.id} app={app} post={post} onLike={() => toggleLike(post)} onSave={() => toggleSave(post)} onComment={(body) => addComment(post, body)} />)}
    {!visiblePosts.length && <Empty items={[]} label="还没有帖子，发第一条吧" />}
  </div>;
}
function LocalSocialCard({ app, post, onLike, onSave, onComment }: { app: "weibo" | "redbook"; post: LocalSocialPost; onLike: () => void; onSave: () => void; onComment: (body: string) => void }) {
  const [comment, setComment] = useState("");
  return <article className={`local-social-card ${app}`}>
    <div className="local-social-author"><Avatar name={post.author || "用户"} /><div><strong>{post.author || "用户"}</strong><small>{post.createdAt}</small></div></div>
    {post.body && <p className="local-social-body">{post.body}</p>}
    {post.media && <img className="local-social-post-image" src={post.media} alt="帖子图片" />}
    <div className="local-social-actions">
      <button aria-pressed={post.liked} onClick={onLike}><Heart size={17} fill={post.liked ? "currentColor" : "none"} /> {post.likes || "点赞"}</button>
      <button onClick={() => document.getElementById(`comment-${post.id}`)?.focus()}><MessageCircle size={17} /> {post.comments.length || "评论"}</button>
      {app === "redbook" && <button aria-pressed={post.saved} onClick={onSave}><Bookmark size={16} fill={post.saved ? "currentColor" : "none"} /> 收藏</button>}
    </div>
    <div className="local-social-comments">
      {post.comments.map((c, i) => <p key={`${post.id}-${i}`}><strong className={c.author === "朱志鑫" ? "zhuxixin-comment" : ""}>{c.author}</strong> {c.body}</p>)}
      <form onSubmit={(e) => { e.preventDefault(); onComment(comment); setComment(""); }}><input id={`comment-${post.id}`} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="说点什么…" maxLength={500} aria-label="发表评论" /><button type="submit" disabled={!comment.trim()}>发送</button></form>
    </div>
  </article>;
}

function Actions({ p, item }: { p: Props; item: Item }) {
  const [liked, setLiked] = useSkinState<boolean>(p, `liked-${item.id}`, false),
    [saved, setSaved] = useSkinState<boolean>(p, `saved-${item.id}`, false);
  return (
    <div className="social-actions">
      <button aria-label={`喜欢${item.title}`} onClick={() => setLiked(!liked)}>
        <Heart size={17} fill={liked ? "currentColor" : "none"} />
        {item.likes + (liked ? 1 : 0) || ""}
      </button>
      <button aria-label={`评论${item.title}`} onClick={() => p.onItem(item)}>
        <MessageCircle size={17} />
        {item.comments.length || ""}
      </button>
      <button aria-label={`详情${item.title}`} onClick={() => p.onItem(item)}>
        <Repeat2 size={17} />
        {meta(item, "reposts")}
      </button>
      <button aria-label={`收藏${item.title}`} onClick={() => setSaved(!saved)}>
        <Bookmark size={16} fill={saved ? "currentColor" : "none"} />
      </button>
    </div>
  );
}
function PostHeader({ item, p }: { item: Item; p: Props }) {
  return (
    <button className="social-author" onClick={() => p.onItem(item)}>
      <Avatar name={item.sender} />
      <span>
        <strong>{item.sender}</strong>
        <small>{meta(item, "handle", item.time)}</small>
      </span>
    </button>
  );
}
export function WeiboSkin(p: Props) {
  const { tab, setTab, q, setQ, items } = useContent(p, "关注");
  const [feed, setFeed] = useState("全部");
  const list = feed === "全部" ? items : items.filter((i) => i.folder === feed);
  return (
    <div className="catalog-skin weibo-ui">
      <Header p={p} />
      <div className="weibo-sections">
        {["关注", "发现", "我"].map((t) => (
          <button
            key={t}
            className={tab === t ? "selected" : ""}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="catalog-scroll">
        {tab === "我" ? (
          <div className="weibo-profile">
            <Avatar name={p.owner ?? "我"} />
            <h2>{p.owner ?? "我"}</h2>
            <span>{items.length} 条微博</span>
          </div>
        ) : (
          <>
            <SearchBox value={q} set={setQ} />
            <div className="weibo-feed-filter">
              {["全部", ...groupItems(items).filter((g) => g !== "未分类")].map(
                (g) => (
                  <button key={g} onClick={() => setFeed(g)}>
                    {g}
                  </button>
                ),
              )}
            </div>
          </>
        )}
        <LocalSocialFeed p={p} app="weibo" items={list} />
      </div>
    </div>
  );
}
export function XSkin(p: Props) {
  const { tab, setTab, q, setQ, items } = useContent(p, "为你推荐");
  return (
    <div className="catalog-skin x-ui">
      <Header p={p} />
      <div className="x-feed-tabs">
        <button
          className={tab === "为你推荐" ? "selected" : ""}
          onClick={() => setTab("为你推荐")}
        >
          为你推荐
        </button>
        <button
          className={tab === "正在关注" ? "selected" : ""}
          onClick={() => setTab("正在关注")}
        >
          正在关注
        </button>
      </div>
      <div className="catalog-scroll">
        <SearchBox value={q} set={setQ} />
        {items
          .filter((i) => tab === "为你推荐" || i.folder === "正在关注")
          .map((i) => (
            <article className="x-post" key={i.id}>
              <Avatar name={i.sender} />
              <div>
                <button className="x-byline" onClick={() => p.onItem(i)}>
                  <strong>{i.sender}</strong>
                  <span>
                    @{meta(i, "handle", i.sender)} · {i.time.slice(5, 10)}
                  </span>
                </button>
                <button className="social-body" onClick={() => p.onItem(i)}>
                  <p>{i.body}</p>
                  {i.media && <Media item={i} />}
                </button>
                <Actions p={p} item={i} />
              </div>
            </article>
          ))}
      </div>
      <Tabs
        tabs={["为你推荐", "正在关注"]}
        value={tab}
        set={setTab}
        icons={[<Home />, <Users />]}
      />
    </div>
  );
}
export function ThreadsSkin(p: Props) {
  const { tab, setTab, items } = useContent(p, "为你推荐");
  return (
    <div className="catalog-skin threads-ui">
      <Header p={p} />
      <div className="threads-title">
        <AtSign size={30} />
        <button
          onClick={() => setTab(tab === "为你推荐" ? "正在关注" : "为你推荐")}
        >
          {tab} ⌄
        </button>
      </div>
      <div className="catalog-scroll">
        {(tab === "个人主页"
          ? items
          : items.filter((i) => tab !== "正在关注" || i.folder === "正在关注")
        ).map((i) => (
          <article className="threads-post" key={i.id}>
            <div className="thread-avatar">
              <Avatar name={i.sender} />
              <i />
            </div>
            <div>
              <div className="threads-byline">
                <strong>{i.sender}</strong>
                <small>{i.time.slice(5, 10)}</small>
              </div>
              <button className="social-body" onClick={() => p.onItem(i)}>
                <p>{i.body}</p>
                {i.media && <Media item={i} />}
              </button>
              <Actions p={p} item={i} />
              <button className="thread-replies" onClick={() => p.onItem(i)}>
                {i.comments.length} 条回复
              </button>
            </div>
          </article>
        ))}
        <Empty items={items} />
      </div>
      <Tabs
        tabs={["为你推荐", "正在关注", "个人主页"]}
        value={tab}
        set={setTab}
        icons={[<Home />, <Users />, <User />]}
      />
    </div>
  );
}
export function FacebookSkin(p: Props) {
  const { tab, setTab, q, setQ, items } = useContent(p, "动态");
  const stories = items.filter((i) => i.folder === "Story");
  return (
    <div className="catalog-skin facebook-ui">
      <Header p={p} />
      <Tabs
        tabs={["动态", "好友", "个人主页"]}
        value={tab}
        set={setTab}
        icons={[<Home />, <Users />, <User />]}
      />
      <div className="catalog-scroll">
        <SearchBox value={q} set={setQ} />
        {tab === "动态" ? (
          <>
            <button
              className="fb-compose"
              disabled={!p.creator}
              onClick={p.onAdd}
            >
              <Avatar name={p.owner ?? "我"} />
              分享新动态
            </button>
            <div className="fb-stories">
              {stories.map((i) => (
                <button key={i.id} onClick={() => p.onItem(i)}>
                  <Media item={i} />
                  <strong>{i.sender}</strong>
                </button>
              ))}
            </div>
            {items
              .filter((i) => i.folder !== "Story")
              .map((i) => (
                <article className="fb-post" key={i.id}>
                  <PostHeader p={p} item={i} />
                  <button className="social-body" onClick={() => p.onItem(i)}>
                    <p>{i.body}</p>
                    {i.media && <Media item={i} />}
                  </button>
                  <Actions p={p} item={i} />
                </article>
              ))}
          </>
        ) : tab === "好友" ? (
          <div className="fb-friends">
            {[...new Set(items.map((i) => i.sender))].map((s) => (
              <button
                key={s}
                onClick={() => p.onItem(items.find((i) => i.sender === s)!)}
              >
                <Avatar name={s} />
                <strong>{s}</strong>
              </button>
            ))}
          </div>
        ) : (
          <>
            <div className="fb-cover" />
            <div className="fb-profile">
              <Avatar name={p.owner ?? "我"} />
              <h1>{p.owner ?? "我"}</h1>
            </div>
            {items
              .filter((i) => i.folder === "个人主页")
              .map((i) => (
                <button
                  key={i.id}
                  className="fb-profile-note"
                  onClick={() => p.onItem(i)}
                >
                  {i.title}
                  <p>{i.body}</p>
                </button>
              ))}
          </>
        )}
      </div>
    </div>
  );
}
export function RedbookSkin(p: Props) {
  const { tab, setTab, q, setQ, items } = useContent(p, "发现");
  const list = tab === "关注" ? items.filter((i) => i.folder === "关注") : items;
  return (
    <div className="catalog-skin redbook-ui">
      <Header p={p} />
      <div className="redbook-top">
        {["关注", "发现", "收藏"].map((t) => (
          <button
            key={t}
            className={tab === t ? "selected" : ""}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="catalog-scroll">
        <SearchBox value={q} set={setQ} />
        <LocalSocialFeed p={p} app="redbook" items={list} savedOnly={tab === "收藏"} />
      </div>
      <Tabs
        tabs={["发现", "收藏"]}
        value={tab}
        set={setTab}
        icons={[<Home />, <Bookmark />]}
      />
    </div>
  );
}
export function PinterestSkin(p: Props) {
  const { tab, setTab, q, setQ, items } = useContent(p, "发现");
  const [board, setBoard] = useState("");
  const list = board
    ? items.filter((i) => (i.folder || "未分类") === board)
    : items;
  return (
    <div className="catalog-skin pinterest-ui">
      <Header p={p} />
      <div className="catalog-scroll">
        {tab === "收藏板" && !board ? (
          <>
            <h1>收藏板</h1>
            <div className="pinterest-boards">
              {groupItems(items).map((g) => (
                <button key={g} onClick={() => setBoard(g)}>
                  <Media
                    item={items.find((i) => (i.folder || "未分类") === g)!}
                  />
                  <strong>{g}</strong>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <SearchBox value={q} set={setQ} />
            {board && (
              <button
                className="pinterest-board-title"
                onClick={() => setBoard("")}
              >
                {board} · 返回收藏板
              </button>
            )}
            <div className="pinterest-pins">
              {list.map((i) => (
                <button key={i.id} onClick={() => p.onItem(i)}>
                  <Media item={i} />
                  <strong>{i.title}</strong>
                </button>
              ))}
            </div>
            <Empty items={list} />
          </>
        )}
      </div>
      <Tabs
        tabs={["发现", "收藏板"]}
        value={tab}
        set={(t) => {
          setTab(t);
          setBoard("");
        }}
        icons={[<Home />, <Grid />]}
      />
    </div>
  );
}
export function RedditSkin(p: Props) {
  const { tab, setTab, q, setQ, items } = useContent(p, "首页");
  const [sort, setSort] = useState("最新");
  const list = [...items].sort((a, b) =>
    sort === "热门" ? b.likes - a.likes : b.time.localeCompare(a.time),
  );
  return (
    <div className="catalog-skin reddit-ui">
      <Header p={p} />
      <div className="reddit-community">
        <Hash size={21} />
        <button onClick={() => setTab(tab === "首页" ? "社区" : "首页")}>
          {tab} ⌄
        </button>
        <select
          aria-label="帖子排序"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          <option>最新</option>
          <option>热门</option>
        </select>
      </div>
      <div className="catalog-scroll">
        <SearchBox value={q} set={setQ} />
        {tab === "社区"
          ? groupItems(items).map((g) => (
              <button
                className="reddit-sub"
                key={g}
                onClick={() => {
                  setQ(g === "未分类" ? "" : g);
                  setTab("首页");
                }}
              >
                <Hash size={22} />
                {g}
                <small>
                  {items.filter((i) => (i.folder || "未分类") === g).length} 帖
                </small>
              </button>
            ))
          : list.map((i) => <RedditPost key={i.id} p={p} item={i} />)}
        <Empty items={items} />
      </div>
      <Tabs
        tabs={["首页", "社区"]}
        value={tab}
        set={setTab}
        icons={[<Home />, <Users />]}
      />
    </div>
  );
}
function RedditPost({ p, item: i }: { p: Props; item: Item }) {
  const [vote, setVote] = useSkinState<number>(p, `vote-${i.id}`, 0);
  return (
    <article className="reddit-post">
      <button className="reddit-byline" onClick={() => p.onItem(i)}>
        r/{meta(i, "community", i.folder || "story")} · u/{i.sender}
      </button>
      <button className="social-body" onClick={() => p.onItem(i)}>
        <h3>{i.title}</h3>
        <p>{i.body}</p>
        {i.media && <Media item={i} />}
      </button>
      <div className="reddit-actions">
        <button
          aria-label={`赞同${i.title}`}
          onClick={() => setVote(vote === 1 ? 0 : 1)}
        >
          <ArrowUp size={17} />
        </button>
        <span>{Number(meta(i, "votes", String(i.likes))) + vote}</span>
        <button
          aria-label={`反对${i.title}`}
          onClick={() => setVote(vote === -1 ? 0 : -1)}
        >
          <ArrowDown size={17} />
        </button>
        <button onClick={() => p.onItem(i)}>
          <MessageCircle size={16} />
          {i.comments.length} 评论
        </button>
      </div>
    </article>
  );
}
export function ForumSkin(p: Props) {
  const { tab, setTab, q, setQ, items } = useContent(p, "帖子");
  const [board, setBoard] = useState("");
  const list = board
    ? items.filter((i) => (i.folder || "未分类") === board)
    : items;
  return (
    <div className="catalog-skin forum-ui">
      <Header p={p} />
      <div className="forum-banner">
        <Hash size={27} />
        <strong>{board || "论坛"}</strong>
        <span>{items.length} 个主题</span>
      </div>
      <div className="catalog-scroll">
        <SearchBox value={q} set={setQ} />
        {tab === "版块"
          ? groupItems(items).map((g) => (
              <button
                className="forum-board"
                key={g}
                onClick={() => {
                  setBoard(g);
                  setTab("帖子");
                }}
              >
                <FolderIcon />
                <div>
                  <strong>{g}</strong>
                  <small>
                    {items.filter((i) => (i.folder || "未分类") === g).length}{" "}
                    个主题
                  </small>
                </div>
                <ChevronRight size={16} />
              </button>
            ))
          : list.map((i) => (
              <button
                className="forum-topic"
                key={i.id}
                onClick={() => p.onItem(i)}
              >
                <strong>
                  {meta(i, "status") && <em>{meta(i, "status")}</em>}
                  {i.title}
                </strong>
                <p>{i.body.split("\n")[0]}</p>
                <div>
                  <span>
                    {i.sender} · {i.time.slice(5, 16)}
                  </span>
                  <span>
                    {meta(i, "views", "—")} 浏览 · {i.comments.length} 回复
                  </span>
                </div>
              </button>
            ))}
      </div>
      <Tabs
        tabs={["帖子", "版块"]}
        value={tab}
        set={(t) => {
          setTab(t);
          setBoard("");
        }}
        icons={[<MessageCircle />, <Grid />]}
      />
    </div>
  );
}
function FolderIcon() {
  return <Hash size={27} />;
}
export function SnapchatSkin(p: Props) {
  const { tab, setTab, items } = useContent(p, "快拍");
  const [index, setIndex] = useState(0);
  const list = items.filter((i) =>
    tab === "回忆"
      ? i.favorite || i.folder === "回忆"
      : tab === "聊天"
        ? i.folder === "聊天"
        : i.folder !== "聊天",
  );
  const i = list[index % Math.max(list.length, 1)];
  return (
    <div className="catalog-skin snapchat-ui">
      <Header p={p} />
      <div className="snap-content">
        {tab === "聊天" ? (
          <div className="snap-chats">
            {list.map((x) => (
              <button key={x.id} onClick={() => p.onItem(x)}>
                <Avatar name={x.sender} />
                <div>
                  <strong>{x.sender}</strong>
                  <small>{x.body}</small>
                </div>
                <Camera size={20} />
              </button>
            ))}
          </div>
        ) : i ? (
          <>
            <Media item={i} />
            <button className="snap-author" onClick={() => p.onItem(i)}>
              <Avatar name={i.sender} />
              {i.sender}
            </button>
            <button
              className="snap-next"
              aria-label="下一条快拍"
              onClick={() => {
                setIndex((n) => n + 1);
                p.onRead(i.id);
              }}
            >
              <ChevronRight size={25} />
            </button>
            <button className="snap-caption" onClick={() => p.onItem(i)}>
              {i.body}
            </button>
          </>
        ) : (
          <p className="catalog-empty">暂无{tab}</p>
        )}
      </div>
      <Tabs
        tabs={["聊天", "快拍", "回忆"]}
        value={tab}
        set={(t) => {
          setTab(t);
          setIndex(0);
        }}
        icons={[<MessageCircle />, <Camera />, <ImageIcon />]}
      />
    </div>
  );
}
function ImageIcon() {
  return <Grid />;
}
